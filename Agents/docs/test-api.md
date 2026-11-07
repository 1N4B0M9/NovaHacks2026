# Test the local ordering API in PowerShell

Use the backend branch and Node 24 or newer. In the repo root run:

```powershell
git fetch origin
git switch backend-ordering
node --version
npm ci
npm test
npm run dev
```

Keep the dev server running. In a second PowerShell window, set the API URL to the port Next printed (normally 3000):

```powershell
$api = 'http://localhost:3000/api/drafts'
function Send-Json($method, $url, $payload) {
    Invoke-RestMethod -Method $method -Uri $url -ContentType 'application/json' -Body ($payload | ConvertTo-Json)
}
$draft = Send-Json POST $api @{text='2 doz eggs, 1 case oat milk'; reviewLanguage='en'}
$draft.lines | Format-Table source,sku,status,reason,requestedQuantity,packSize
$draftUrl = "$api/$($draft.id)"
$eggLine = $draft.lines | Where-Object sku -eq 'E180'
$lineUrl = "$draftUrl/lines/$($eggLine.id)"
```

Eggs should show 24 requested and a 180-unit pack. The draft has a provisional total of 2400 cents and cannot be approved yet. Optionally try approving now and expect HTTP 409 with `review_required`.

```powershell
$updated = Send-Json PATCH $lineUrl @{version=$draft.version; action='skip'}
$receipt = Send-Json POST "$draftUrl/approve" @{version=$updated.version}
$receipt | ConvertTo-Json -Depth 5
$retry = Send-Json POST "$draftUrl/approve" @{version=$updated.version}
$retry.orderId -eq $receipt.orderId
```

Expect one simulated milk case, `totalMinor = 2400`, and `True` on retry. For the buy path, create a **fresh draft** by rerunning the first request block. Use the following in place of the skip:

```powershell
$updated = Send-Json PATCH $lineUrl @{version=$draft.version; action='accept_pack'; sku='E180'; cases=1}
$receipt = Send-Json POST "$draftUrl/approve" @{version=$updated.version}
$receipt | ConvertTo-Json -Depth 5
```

Expect both SKUs and `totalMinor = 7800`. To exercise stale approval, submit the original version after editing; expect HTTP 409 and `stale_version`. All purchases are simulated. The service tests use isolated databases; manual requests persist in the local demo database.
