// Builds the Swift capture helper in release mode and copies it to native/bin/.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

if (process.platform !== 'darwin') {
  console.log('build-native: skipped (macOS only)')
  process.exit(0)
}

const pkg = join('native', 'RecsceneCapture')
execFileSync('swift', ['build', '-c', 'release', '--package-path', pkg], { stdio: 'inherit' })
mkdirSync(join('native', 'bin'), { recursive: true })
copyFileSync(join(pkg, '.build', 'release', 'recscene-capture'), join('native', 'bin', 'recscene-capture'))
console.log('build-native: native/bin/recscene-capture')
