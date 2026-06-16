import axios from 'axios';

const normalizeLegacyRevenue = (data = {}) => ({
  ...data,
  monthRevenue: data.monthRevenue ?? 0,
  availableBalance: data.availableBalance ?? data.pendingRevenue ?? 0,
  availableRevenue: data.availableRevenue ?? data.pendingRevenue ?? 0,
  totalWithdrawn: data.totalWithdrawn ?? data.paidRevenue ?? 0,
  processingWithdrawals: data.processingWithdrawals ?? 0,
  minimumWithdrawal: data.minimumWithdrawal ?? 100000,
  history: data.history ?? data.recentTransactions ?? [],
  recentTransactions: data.recentTransactions ?? data.history ?? [],
});

export const getInstructorWallet = async () => {
  try {
    const response = await axios.get('/api/instructor/wallet');
    return response.data;
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }

    const legacyResponse = await axios.get('/api/instructor/revenue');
    return normalizeLegacyRevenue(legacyResponse.data);
  }
};
