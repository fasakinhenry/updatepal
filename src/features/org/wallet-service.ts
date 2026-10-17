// mock wallet service. in production every number comes from the server, never from client math.
export const wallet = { currency: "NGN", balance: 0, feePercent: 0, txs: [] as { id: string; label: string; amount: number; status: string }[] };
export const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: wallet.currency }).format(n);
export const quote = (amount: number, orgPercent: number) => {
  const orgShare = Math.round(amount * orgPercent) / 100;
  return { fee: Math.round(amount * wallet.feePercent) / 100, orgShare, posterShare: amount - orgShare };
};
