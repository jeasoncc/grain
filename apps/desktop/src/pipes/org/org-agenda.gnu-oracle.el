;;; Owned semantic inputs only; use installed unmodified GNU calendar primitives.
(require 'org-agenda)
(require 'json)
(let ((rows nil))
  (dolist (stamp '("<2026-01-31 Sat +1m>"
                   "<2024-02-29 Thu +1y>"
                   "<2026-10-01 Thu .+2d>"
                   "<2026-10-01 Thu ++2d>"
                   "<2026-10-01 Thu 09:00 +5h>"
                   "<2026-10-01 Thu 09:00 +49h>"))
    (dolist (day '("2026-03-01" "2026-03-03" "2026-10-03" "2026-10-04"))
      (let ((past (calendar-gregorian-from-absolute (org-closest-date stamp day 'past)))
            (future (calendar-gregorian-from-absolute (org-closest-date stamp day 'future))))
        (push `((stamp . ,stamp) (day . ,day)
                (past . ,(format "%04d-%02d-%02d" (nth 2 past) (nth 0 past) (nth 1 past)))
                (future . ,(format "%04d-%02d-%02d" (nth 2 future) (nth 0 future) (nth 1 future)))) rows))))
  (princ (json-serialize `((emacsVersion . ,emacs-version) (orgVersion . ,(org-version))
                          (rows . ,(vconcat (nreverse rows)))))))
