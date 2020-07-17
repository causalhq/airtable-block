# Causal Airtable block

The Causal block shows you a revenue forecast chart based on a list of leads in your Airtable CRM. It takes inputs like "expected deal value", "expected close date", "probability of close", and crunches the numbers to show your future revenue based on your sales pipeline. Whenever your pipeline updates, you can recalculate your forecast in one click.

In this v1, we defined a specific sales forecasting model in Causal (https://causal.app), which your Airtable data gets fed into. Causal is a flexible number-crunching tool that lets you define your own custom models based on formulas — in the next version of our block, we'll let you connect to your own personal Causal models. You'll be able to define your calculations in Causal, and hook them up to an Airtable table to see custom charts and data tables within Airtable.

## How to remix this block

1. Create a new base (or you can use an existing base).

2. Create a new block in your base (see [Create a new block](https://airtable.com/developers/blocks/guides/hello-world-tutorial#create-a-new-block),
   selecting "Remix from Github" as your template.

3. From the root of your new block, run `block run`.
