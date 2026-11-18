#!/bin/zsh
# Walks the app through every state the boards show, screenshotting and DOM-auditing each.
S=${AUDIT_DIR:-$(pwd)/.audit}
OUT=$S/audit; mkdir -p $OUT; : > $OUT/audit.log
cd $S
ev() { node cdp.mjs "$1" "$2"; }
click() { ev "$1" "(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='$2');if(!b)return 'MISSING $2';b.click();return 'ok'})()" >/dev/null; }
clickSel() { ev "$1" "(()=>{const b=document.querySelector('$2');if(!b)return 'MISSING $2';b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));b.click();return 'ok'})()" >/dev/null; }
key() { ev "$1" "window.dispatchEvent(new KeyboardEvent('keydown',{key:'$2',$3bubbles:true})); 'key'" >/dev/null; }
closeDlg() { ev "$1" "(()=>{const c=document.querySelector('.export__close'); if(c){c.click();return 'x'} const b=document.querySelector('.cmd__backdrop'); if(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));return 'backdrop'} return 'none'})()" >/dev/null; }
closeItem() { ev "$1" "(()=>{document.querySelector('.inspector__close')?.click(); return 'ok'})()" >/dev/null; }
snap() { sleep ${3:-0.7}; node cdp-shot.mjs "$1" $OUT/$2.png; node audit.mjs "$1" "$2" >> $OUT/audit.log; }
pkill -f 'electron-vite dev'; pkill -f 'Recscene/node_modules/electron'; sleep 2
cd /Users/subhamdas/Personal_Project/Recscene && npx electron-vite build >/dev/null 2>&1 && (npx electron . --remote-debugging-port=9222 > $S/app.log 2>&1 &)
until curl -s http://127.0.0.1:9222/json >/dev/null 2>&1; do sleep 1; done; sleep 3; cd $S
snap editor home-recent 1
click editor "All projects"; snap editor home-all
ev editor "window.recscene.project.open('${AUDIT_PROJECT:?set AUDIT_PROJECT to a .recscene bundle}').then(p=>p.project.name)" >/dev/null; sleep 4
for p in Zooms Clips Cursor Camera Background Masks Shortcuts Captions Audio Animation; do click editor "$p"; snap editor panel-$p; done
clickSel editor '.tl__zi:not(.tl__zi--layout):not(.tl__zi--mask):not(.tl__zi--voice):not(.tl__zi--caption)'; snap editor item-zoom
clickSel editor '.tl__clip'; snap editor item-clip
clickSel editor '.tl__zi--layout'; snap editor item-layout
clickSel editor '.tl__zi--mask'; snap editor item-mask
clickSel editor '.tl__zi--voice'; snap editor item-voiceover
closeItem editor
click editor "Captions"; ev editor "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/transcript/i.test(b.textContent)&&!/export/i.test(b.textContent));if(!b)return 'no transcript button';b.click();return b.textContent})()"; snap editor transcript-editor; closeDlg editor; key editor Escape
click editor "Export"; snap editor export 1.5; closeDlg editor
click editor "Presets"; snap editor presets 1; closeDlg editor
key editor k 'metaKey:true,'; snap editor command-menu; closeDlg editor
key editor / 'metaKey:true,'; snap editor shortcuts-guide; closeDlg editor
click editor "Crop"; snap editor crop; key editor Escape; closeDlg editor
ev editor "window.recscene.settings.set({appearance:'light'}).then(()=>'light')" >/dev/null; sleep 1; click editor "Zooms"; clickSel editor '.tl__zi:not(.tl__zi--layout):not(.tl__zi--mask):not(.tl__zi--voice):not(.tl__zi--caption)'; snap editor light-editor 1; closeItem editor
ev editor "window.recscene.settings.open('general').then(()=>'ok')" >/dev/null; sleep 2; snap settings light-settings
ev editor "window.recscene.settings.set({appearance:'system'}).then(()=>'sys')" >/dev/null; sleep 1
for t in General Recording Editing Shortcuts Advanced Experimental Account; do click settings "$t"; snap settings settings-$t; done
ev editor "window.recscene.openPicker().then(()=>'ok')" >/dev/null; sleep 2.5; snap picker picker-display 1
for t in Window Area Device; do click picker "$t"; snap picker picker-$t 1.2; done
click picker "Display"; clickSel picker '.device__more'; snap picker picker-camera-menu; key picker Escape
ev picker "(()=>{const b=document.querySelectorAll('.device__more')[1];b.click();return 'ok'})()" >/dev/null; snap picker picker-mic-menu; key picker Escape
ev picker "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Countdown/.test(b.textContent));b&&b.click();return 'ok'})()" >/dev/null; snap picker picker-countdown-menu; key picker Escape
echo DONE >> $OUT/audit.log
