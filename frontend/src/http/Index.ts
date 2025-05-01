import axios from 'axios';

const http = axios.create({
  baseURL: 'http://localhost:26535',
  timeout: 10000
});

http.interceptors.request.use(
  (config) => {
    const username = 'admin';
    const password = '123456';
    const token = btoa(`${username}:${password}`);

    config.headers.Authorization = `Basic ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default http;
