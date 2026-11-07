# Mise presentation UI · issue #34

The scan hero uses the pitch deck's serrated ticket edge, one egg case and one oat-milk case. Content follows the selected English, Spanish or Chinese review language. Removed the header badges, introductory paragraph, explanatory footer and repeated demo copy.

Two-pass OCR and pre-read cropping are still used. A photo now opens one editable ingredient list, including any lines returned by just one reader. The original remains available in photo/settings. Add, edit or remove lines, then explicitly add the reviewed list to the ZIP cart. Individual engine outputs and confidence decisions are internal. Long ingredient lists, cart rows and receipts are bounded independently of the total and action button.

Verified production build and Chromium at 390px and 1280px. Fixture disagreements yielded one 18-item list; edits, add/remove, localized tickets, cart scrolling and no horizontal overflow passed. Live cropped Chinese fixture produced a USD 78 simulated receipt. The build check also uncovered two pre-existing TypeScript errors: added the Chinese price-at-store label and limited the pepper teaspoon query to the supported unit.
