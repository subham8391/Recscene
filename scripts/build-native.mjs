// Builds the Swift capture helper in release mode and copies it to native/bin/.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

if (process.platform !== 'darwin') {
  console.log('build-native: skipped (macOS only)')
  process.exit(0)
}

const pkg = join('native', 'RecsceneCapture')
execFileSync('swift', ['build', '-c', 'release', '--package-path', pkg], { stdio: 'inherit' })
mkdirSync(join('native', 'bin'), { recursive: true })
// Write to a new file and rename it over the old one. Overwriting the helper in place keeps the old
// inode, and macOS then kills every later launch of it with SIGKILL ("capture helper exited with code
// null" in the app) because the kernel's cached code signature no longer matches the bytes on disk.
const target = join('native', 'bin', 'recscene-capture')
const fresh = `${target}.new`
copyFileSync(join(pkg, '.build', 'release', 'recscene-capture'), fresh)
execFileSync('codesign', ['-s', '-', '-f', fresh], { stdio: 'ignore' })
renameSync(fresh, target)
console.log('build-native: native/bin/recscene-capture')
