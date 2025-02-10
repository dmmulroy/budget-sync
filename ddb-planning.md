# entities
- transactions
  - type (ynab, split, sync)



# access patterns

## Get transactions by type

{
 pk: "transactions#type"
 sk: "updatedAt"
}

### Get Splitwise transactions by Year
{
 pk: "transactions#splitwise"
 sk: "2025"
}

### Get Splitwise transactions by Month
{
 pk: "transactions#splitwise"
 sk: "2024/12"
}

### Get Splitwise transactions by Day
{
 pk: "transactions#splitwise"
 sk: "2024/12/07"
}

