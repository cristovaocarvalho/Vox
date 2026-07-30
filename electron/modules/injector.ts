import { execFile } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clipboard } = require('electron')

export type InjectionMode = 'type' | 'clipboard'

export async function injectText(text: string, _mode: InjectionMode = 'clipboard', delayMs = 100, hwnd?: string): Promise<void> {
  if (!text || text.trim().length === 0) return

  try {
    console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars)...`)

    // 1. Copia o texto para a área de transferência do sistema
    clipboard.writeText(text)

    // 2. Pequeno delay para garantir que a área de transferência foi atualizada
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    // 3. Monta o comando PowerShell:
    //    - Se temos o HWND da janela original: restaura o foco e cola com SendKeys
    //    - Caso contrário: cola direto na janela em foco atual
    const psCommand = hwnd && hwnd !== '0'
      ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${hwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^v')`
      : `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`

    // 4. Executa via execFile (sem shell) com janela oculta para não roubar o foco
    execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], (err) => {
      if (err) {
        console.error('[Injector] Erro ao colar texto via PowerShell:', err)
      } else {
        console.log('[Injector] Texto colado no cursor com sucesso!')
      }
    })
  } catch (err) {
    console.error('[Injector] Erro no processo de injeção:', err)
  }
}

export default {
  injectText
}
