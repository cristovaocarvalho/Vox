import { execFile, execFileSync } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let restoreMuteState: boolean | null = null

function buildScript(muted: boolean): string {
  const src = [
    'using System;',
    'using System.Runtime.InteropServices;',
    '',
    'public static class VoxAudio {',
    '  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]',
    '  private class MMDeviceEnumerator { }',
    '',
    '  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]',
    '  private interface IMMDeviceEnumerator {',
    '    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out object devices);',
    '    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);',
    '    [PreserveSig] int GetDevice(string id, out IMMDevice device);',
    '    [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);',
    '    [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);',
    '  }',
    '',
    '  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]',
    '  private interface IMMDevice {',
    '    [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);',
    '    [PreserveSig] int OpenPropertyStore(int access, out object properties);',
    '    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);',
    '    [PreserveSig] int GetState(out int state);',
    '  }',
    '',
    '  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]',
    '  private interface IAudioEndpointVolume {',
    '    [PreserveSig] int RegisterControlChangeNotify(IntPtr client);',
    '    [PreserveSig] int UnregisterControlChangeNotify(IntPtr client);',
    '    [PreserveSig] int GetChannelCount(out uint channelCount);',
    '    [PreserveSig] int SetMasterVolumeLevel(float level, ref Guid eventContext);',
    '    [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid eventContext);',
    '    [PreserveSig] int GetMasterVolumeLevel(out float level);',
    '    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);',
    '    [PreserveSig] int SetChannelVolumeLevel(uint channel, float level, ref Guid eventContext);',
    '    [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid eventContext);',
    '    [PreserveSig] int GetChannelVolumeLevel(uint channel, out float level);',
    '    [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);',
    '    [PreserveSig] int SetMute(bool mute, ref Guid eventContext);',
    '    [PreserveSig] int GetMute(out bool mute);',
    '    [PreserveSig] int GetVolumeStepInfo(out uint step, out uint stepCount);',
    '    [PreserveSig] int VolumeStepUp(ref Guid eventContext);',
    '    [PreserveSig] int VolumeStepDown(ref Guid eventContext);',
    '    [PreserveSig] int QueryHardwareSupport(out uint hardwareSupportMask);',
    '    [PreserveSig] int GetVolumeRange(out float volumeMin, out float volumeMax, out float volumeStep);',
    '  }',
    '',
    '  public static int SetMuteAndGetPrevious(bool mute) {',
    '    try {',
    '      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());',
    '      IMMDevice device;',
    '      int hr = enumerator.GetDefaultAudioEndpoint(0, 0, out device);',
    '      if (hr != 0) return -1;',
    '      var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");',
    '      object volumeObj;',
    '      hr = device.Activate(ref iid, 7, IntPtr.Zero, out volumeObj);',
    '      if (hr != 0) return -1;',
    '      var volume = (IAudioEndpointVolume)volumeObj;',
    '      bool previous;',
    '      hr = volume.GetMute(out previous);',
    '      if (hr != 0) return -1;',
    '      var ctx = Guid.Empty;',
    '      hr = volume.SetMute(mute, ref ctx);',
    '      if (hr != 0) return -1;',
    '      return previous ? 1 : 0;',
    '    } catch {',
    '      return -1;',
    '    }',
    '  }',
    '}'
  ].join('\n')

  const ps = [
    '$src = @\'',
    src,
    '\'@',
    'Add-Type -TypeDefinition $src',
    `$target = ${muted ? '$true' : '$false'}`,
    '$prev = [VoxAudio]::SetMuteAndGetPrevious($target)',
    'if ($prev -eq -1) { exit 1 }',
    'Write-Output $prev'
  ].join('\n')

  return ps
}

async function run(muted: boolean): Promise<boolean | null> {
  // macOS (Darwin): osascript volume controls
  if (process.platform === 'darwin') {
    try {
      const { stdout: currentMute } = await execFileAsync(
        'osascript',
        ['-e', 'output muted of (get volume settings)'],
        { timeout: 2000, encoding: 'utf8' }
      )
      const wasMuted = currentMute.trim().toLowerCase() === 'true'
      await execFileAsync(
        'osascript',
        ['-e', `set volume output muted ${muted ? 'true' : 'false'}`],
        { timeout: 2000 }
      )
      return wasMuted
    } catch (err) {
      console.warn('[AudioMute] Falha ao alterar o mute no macOS:', err)
      return null
    }
  }

  // Windows (Win32): COM CoreAudio script
  if (process.platform !== 'win32') return null
  try {
    const encoded = Buffer.from(buildScript(muted), 'utf16le').toString('base64')
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      { timeout: 4000, encoding: 'utf8' }
    )
    const prev = stdout.trim()
    if (prev === '1') return true
    if (prev === '0') return false
    // COM approach returned unexpected output — try SendInput fallback
    console.warn('[AudioMute] COM retornou valor inesperado, tentando fallback SendInput...')
  } catch (err) {
    console.warn('[AudioMute] COM falhou, tentando fallback SendInput:', err)
  }

  // Fallback: SendInput com VK_VOLUME_MUTE (0xAD)
  try {
    const fallbackScript = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name KI -Namespace VOX; [VOX.KI]::keybd_event(0xAD, 0, 0, [UIntPtr]::Zero); [VOX.KI]::keybd_event(0xAD, 0, 2, [UIntPtr]::Zero)`
    const enc = Buffer.from(fallbackScript, 'utf16le').toString('base64')
    await execFileAsync('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', enc], { timeout: 3000 })
    return false // assume was not muted (best effort)
  } catch (err2) {
    console.warn('[AudioMute] Fallback SendInput também falhou:', err2)
    return null
  }
}

export async function muteSystemAudio(): Promise<void> {
  const prev = await run(true)
  if (prev !== null) restoreMuteState = prev
}

export async function unmuteSystemAudio(): Promise<void> {
  if (restoreMuteState === null) return
  const target = restoreMuteState
  restoreMuteState = null
  await run(target)
}

export function unmuteSystemAudioSync(): void {
  if (restoreMuteState === null) return
  const target = restoreMuteState
  restoreMuteState = null

  if (process.platform === 'darwin') {
    try {
      execFileSync(
        'osascript',
        ['-e', `set volume output muted ${target ? 'true' : 'false'}`],
        { timeout: 2000 }
      )
    } catch (err) {
      console.warn('[AudioMute] Falha ao restaurar o mute no macOS (sync):', err)
    }
    return
  }

  if (process.platform !== 'win32') return
  try {
    const encoded = Buffer.from(buildScript(target), 'utf16le').toString('base64')
    execFileSync(
      'powershell',
      ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      { timeout: 4000, encoding: 'utf8' }
    )
  } catch (err) {
    console.warn('[AudioMute] Falha ao restaurar o mute do sistema:', err)
  }
}
