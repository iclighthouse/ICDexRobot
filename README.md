一、 Running the Backend

1. cd robot/backend

2. Install **Node.js v20**

   1. Visit the Node.js download page：https://nodejs.org/en/download

   2. Download and install version **v20.18.3**

   3. Verify the installation by running:

      ```bash
      node -v
      npm -v
      ```
   
3. Install **pm2** globally:

   ```
   npm install pm2 -g
   ```

4. Install project dependencies:

   ```
   npm i
   ```

5. Start the backend service:

   ```
   npm run start
   ```

   **Note:**
   If  the error message `"Failed to connect to Binance servers."`, you may need to configure a terminal proxy and restart the service.

   > To set up the proxy:
   >
   > - Connect your VPN
   > - Copy the terminal proxy command from your VPN app
   > - Replace the port (`7890`) with your VPN’s actual port and run:

   ```bash
   export https_proxy=http://127.0.0.1:7890/
   export http_proxy=http://127.0.0.1:7890/
   export all_proxy=socks5://127.0.0.1:7890
   ```

6. To stop the backend service:

   ```
   pm2 kill
   ```


**Note:**
The backend service uses **port 26535** by default. If you encounter an error indicating that port 26535 is already in use, follow these steps:

1. Check which process is using the port:
   On **Windows**：

   ```bash
   netstat -ano | findstr :26535
   ```

   On **macOS/Linux**:

   ```bash
   lsof -i:26535
   ```

2. Terminate the process:

   On **Windows**:

   ```bash
   taskkill /PID <pid> /F
   ```

   On **macOS/Linux**:

   ```bash
   kill -9 <pid>
   ```

   Example:

   ```bash
   kill -9 1234
   ```

二、Running the Frontend

- Open the **web page** by double-clicking the `index.html` file located in the `frontend_dist` folder. It will open in your default browser.



三、Updating the Project

1. If the Robot program is running, stop all processes first:

   ```bash
   pm2 kill
   ```

2. Replace the following folders inside the `robot` directory with the updated versions:

   `backend`

   `frontend`

   `frontend_dist`

   > Choose **Replace All** when prompted.

3. If the backend was running before the update, ensure it is stopped:

   ```bash
   pm2 kill
   ```

4. Install dependencies in the updated backend directory:

   ```
   npm i
   ```

5. Restart the backend service:

   ```
   npm run start
   ```

6. Reopen the `index.html` file located in the `frontend_dist` folder.
