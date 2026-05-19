; Pulse NSIS installer hooks
; Installs the Visual C++ 2015-2022 Redistributable if not already present.
; The vc_redist.x64.exe must be placed in src-tauri/resources/ before building.

!macro NSIS_HOOK_POSTINSTALL
  ; Check if VC++ 2015-2022 Redistributable (x64) is already installed
  ReadRegDWord $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 == 1
    DetailPrint "Visual C++ Redistributable already installed, skipping."
    Goto vcredist_done
  ${EndIf}

  ; Try to run the bundled redistributable installer
  ${If} ${FileExists} "$INSTDIR\resources\vc_redist.x64.exe"
    DetailPrint "Installing Visual C++ Redistributable (required for BPM detection)..."
    ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /passive /norestart' $0
    ${If} $0 == 0
      DetailPrint "Visual C++ Redistributable installed successfully."
    ${ElseIf} $0 == 3010
      DetailPrint "Visual C++ Redistributable installed (reboot may be required)."
    ${Else}
      DetailPrint "Visual C++ Redistributable installer returned code $0."
      MessageBox MB_OK|MB_ICONINFORMATION "Visual C++ Redistributable could not be installed automatically (code $0).$\n$\nBPM detection may not work.$\nYou can install it manually from: https://aka.ms/vs/17/release/vc_redist.x64.exe"
    ${EndIf}
    ; Clean up the bundled installer to save disk space
    Delete "$INSTDIR\resources\vc_redist.x64.exe"
  ${Else}
    DetailPrint "vc_redist.x64.exe not bundled, skipping VC++ install."
  ${EndIf}

  vcredist_done:
!macroend
