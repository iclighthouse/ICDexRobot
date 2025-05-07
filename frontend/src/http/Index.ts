import axios from 'axios';
import { User } from '@/views/home/model';
const http = axios.create({
  baseURL: 'http://localhost:26535',
  timeout: 10000
});
http.interceptors.request.use(
  async (config) => {
    const user = await getUser();
    if (user) {
      const username = user.userName;
      const password = user.password;
      const token = btoa(`${username}:${password}`);
      config.headers.Authorization = `Basic ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
const getUser = async (): Promise<User | null> => {
  const res = await axios.get('http://localhost:26535/getUser');
  if (res.status === 200) {
    return res.data;
  }
};
export default http;
