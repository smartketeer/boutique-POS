import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import axios from 'axios';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            branchName: 'luna branch',
            initialized: false,
            setBranchName: (branchName) => set({ branchName }),
            resolveBranchName: async (user) => {
                if (user?.branch?.name) return user.branch.name;
                if (user?.branch_name) return user.branch_name;
                if (user?.branch_id != null) {
                    const branches = Array.isArray(user?.branches) ? user.branches : [];
                    const found = branches.find((b) => Number(b?.id) === Number(user.branch_id));
                    if (found?.name) return found.name;
                }
                return 'luna branch';
            },
            login: async (email, password) => {
                try {
                    const response = await axios.post('/api/login', { email, password });
                    const { user, access_token } = response.data;
                    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                    const branchName = await useAuthStore.getState().resolveBranchName(user);
                    set({ user, token: access_token, branchName, initialized: true });
                    return user;
                } catch (error) {
                    console.error('Login error details:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status
                    });
                    throw error;
                }
            },
            logout: async () => {
                try {
                    await axios.post('/api/logout');
                } catch {
                }
                set({ user: null, token: null, initialized: true });
                delete axios.defaults.headers.common['Authorization'];
            },
            clear: () => {
                set({ user: null, token: null, initialized: true });
                delete axios.defaults.headers.common['Authorization'];
            },
            init: async () => {
                const state = useAuthStore.getState();
                if (state.token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
                    try {
                        const meRes = await axios.get('/api/me');
                        const branchName = await useAuthStore.getState().resolveBranchName(meRes.data);
                        set({ user: meRes.data, branchName, initialized: true });
                    } catch {
                        set({ user: null, token: null, initialized: true });
                        delete axios.defaults.headers.common['Authorization'];
                    }
                    return;
                }
                set({ initialized: true });
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                token: state.token,
                branchName: state.branchName,
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
                }
            },
        }
    )
);
