#!/usr/bin/env bash
# Usage: radix-select.sh <trigger_label_substring> <option_label>
# Opens the shadcn/Radix Select whose combobox trigger contains the substring,
# then clicks the option with the exact label.
TRIGGER="$1"; OPTION="$2"
cd /home/z/my-project

# Open the trigger
agent-browser eval "(() => { const t = [...document.querySelectorAll('button[role=combobox]')].find(c => c.textContent.includes('$TRIGGER')); if (!t) return 'trigger not found: $TRIGGER'; t.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true})); t.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0})); t.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true})); t.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, button: 0})); t.click(); return 'opened'; })()" > /dev/null
sleep 1

# Click the option
agent-browser eval "(() => { const o = [...document.querySelectorAll('[role=option]')].find(x => x.textContent.trim() === '$OPTION'); if (!o) return 'option not found: $OPTION'; const r = o.getBoundingClientRect(); const cx = r.left + r.width/2, cy = r.top + r.height/2; const opts = {bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true}; for (const t of ['pointerdown','mousedown','pointerup','mouseup','click']) { const Ev = (t.startsWith('pointer') ? PointerEvent : MouseEvent); o.dispatchEvent(new Ev(t, opts)); } return 'clicked $OPTION'; })()"
