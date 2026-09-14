# Data dictionary

The prototype's synthetic borrower table has:

- `id`: borrower identifier
- `name`: display name
- `income`: estimated monthly household/business income
- `payment`: monthly loan repayment
- `buffer`: liquid emergency buffer
- `stress`: starting stress score

Network edges have:

- `source`
- `target`
- `weight`: relationship strength from 0 to 1

For a real deployment, the same structure can be replaced by historical repayment, income, guarantee, and relationship records.
