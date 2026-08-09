---
'@streamline-pulse/formkrafter-wc': patch
---

Extend the host-styling hardening from border-radius to typography: toolbar
buttons and tabs now pin `text-transform` and `letter-spacing`, and field
wrappers pin `font-style` and `text-decoration`, so global `button`/`label`
rules in the host application no longer distort the chrome.
