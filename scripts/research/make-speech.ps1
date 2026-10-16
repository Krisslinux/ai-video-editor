param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
try {
  $synth.SelectVoice('Microsoft David Desktop')
  foreach ($word in @('one','two','three','four','five','six')) {
    $target = Join-Path $OutputDirectory ($word + '.wav')
    if (Test-Path -LiteralPath $target) { throw "Refusing to overwrite $target" }
    $synth.SetOutputToWaveFile($target, $format)
    $synth.Speak($word)
    $synth.SetOutputToNull()
  }
  $synth.Voice | Select-Object Name,Culture,Gender | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputDirectory 'voice.json') -Encoding UTF8
} finally { $synth.Dispose() }