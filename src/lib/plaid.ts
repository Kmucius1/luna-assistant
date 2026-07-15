import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

// Real bank connections — Plaid's Production environment (covers Trial-plan
// access too; Trial is a billing tier, not a separate API basePath). Falls
// back to Sandbox only if no production secret has been added yet, so local
// dev keeps working with PLAID_SANDBOX_SECRET before PLAID_SECRET exists.
const usingProduction = !!process.env.PLAID_SECRET

const configuration = new Configuration({
  basePath: usingProduction ? PlaidEnvironments.production : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': usingProduction ? process.env.PLAID_SECRET : process.env.PLAID_SANDBOX_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
