## 1. Run the Backend

1. **Navigate to the Backend Directory**

   ```bash
   cd robot/backend
   ```

2. **Install Node.js v20**

   - Visit the Node.js download page: https://nodejs.org/en/download

   - Download and install **v20.18.3**.

   - Run the following commands to verify the installation:

     ```bash
     node -v
     npm -v
     ```

3. **Install pm2 Globally**
   Run the following command to install **pm2** globally:

   ```bash
   npm install pm2 -g
   ```

4. **Install Project Dependencies**
   In the `backend` directory, run the following command to install project dependencies:

   ```bash
   npm i
   ```

5. **Start the Backend Service**
   Run the following command to start the backend service:

   ```bash
   npm run start
   ```

   **Note:**
   If you encounter the error message `"Unable to connect to Binance server"`, you may need to configure a terminal proxy and restart the service.

   > **Set Up Proxy:**
   >
   > - Connect to your VPN.
   >
   > - Copy the terminal proxy command from your VPN application.
   >
   > - Replace the port (e.g.,7890) with the actual port of your VPN, then run:
   >
   >   ```bash
   >   export https_proxy=http://127.0.0.1:7890/
   >   export http_proxy=http://127.0.0.1:7890/
   >   export all_proxy=socks5://127.0.0.1:7890
   >   ```

6. **Stop the Backend Service**
   Run the following command to stop the backend service:

   ```bash
   pm2 kill
   ```

   **Note:**
   The backend service uses **port 26535** by default. If you encounter an error indicating that port 26535 is already occupied, follow these steps:

   1. **Check which process is using the port:**

      - On Windows:

        ```bash
        netstat -ano | findstr :26535
        ```

      - On macOS/Linux:

        ```bash
        lsof -i:26535
        ```

   2. **Kill the process:**

      - On Windows:

        ```bash
        taskkill /PID <pid> /F
        ```

      - On macOS/Linux:

        ```bash
        kill -9 <pid>
        ```

        Example:

        ```bash
        kill -9 1234
        ```

## 2. Run the Frontend

- Open your browser and visit the following address:
  [http://localhost:26535](http://localhost:26535/)

## 3. Update the Project

1. **Stop All Running Processes**
   If the Robot program is running, stop all processes first:

   ```bash
   pm2 kill
   ```

2. **Replace Updated Files**
   Replace the following folders in the `robot` directory with the updated versions:

   - `backend`
   - `frontend`

   > **Note:**
   > When prompted whether to overwrite files, select **Replace All**.

3. **Ensure the Backend Service is Stopped**
   If the backend service was running before the update, ensure it is stopped:

   ```bash
   pm2 kill
   ```

4. **Install Dependencies in the Updated Backend**
   In the updated `backend` directory, run the following command to install dependencies:

   ```bash
   npm i
   ```

5. **Restart the Backend Service**
   Run the following command to restart the backend service:

   ```bash
   npm run start
   ```

6. **Revisit the Frontend**
   Open your browser and revisit the following address:
   [http://localhost:26535](http://localhost:26535/)
