# 🌾 Krishi Mitra - AI-Powered Smart Farming Assistant

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Active-success.svg)
![Stack](https://img.shields.io/badge/stack-MERN-blueviolet)

Krishi Mitra is a comprehensive, intelligent farming assistant designed to empower farmers with real-time data, AI-driven insights, and effortless farm management tools. By integrating IoT, machine learning, and localized data, Krishi Mitra helps optimize crop yields, detect diseases early, and bridge the gap between farmers and the market.

## ✨ Key Features

- **🔐 Secure Authentication & Personalization**: User creation, login, and profile management to save your farm's unique data.
- **📊 Interactive Dashboard**: A central hub monitoring key metrics like weather, soil health, and quick actions.
- **🌦️ Smart Weather Forecasting**: Real-time accurate weather updates to help plan farming activities.
- **🦠 AI Disease Detection**: Upload photos of your crops to instantly identify diseases and get treatment recommendations.
- **🌍 Soil & Water Analysis**: Track and analyze soil moisture and quality to optimize irrigation.
- **💹 Market Insights**: Stay updated with current market prices (Mandi rates) for various crops.
- **🤖 Crop Recommendation**: AI-powered suggestions for the best crops to grow based on your location and season.
- **📷 IoT Camera Integration**: Integration with IP cameras for remote field monitoring and snapshots.
- **🌐 Multi-Language Support**: Accessible to farmers in their native language.

## 🛠️ Technology Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons).
- **Backend**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/).
- **Database**: [MongoDB](https://www.mongodb.com/).
- **AI/ML**: Integration with Groq, PlantID, and other AI services.
- **IoT**: IP Camera connectivity.

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

*   [Node.js](https://nodejs.org/en/download/) (v14 or higher)
*   [Git](https://git-scm.com/downloads)
*   [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Account or local MongoDB.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/krishi-mitra.git
    cd krishi-mitra
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    The root `server.js` requires additional packages. Run:
    ```bash
    npm install mongoose bcryptjs body-parser
    ```

### Configuration

#### 1. Environment Variables (`.env`)
Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```
Fill in your API keys:
```env
VITE_GROQ_API_KEY=your_groq_key
VITE_GOOGLE_API_KEY=your_google_key
VITE_PLANTID_API_KEY=your_plantid_key
VITE_PERPLEXITY_API_KEY=your_perplexity_key
VITE_VOICE_RSS_KEY=your_voice_key
VITE_WEATHER_API_KEY=your_weather_key
```

#### 2. Backend Config (`config.json`)
Create a `config.json` file in the root directory for your database connection:
```json
{
  "mongoURI": "mongodb+srv://<username>:<password>@cluster.mongodb.net/krishi_mitra?retryWrites=true&w=majority"
}
```

## 🏃‍♂️ Running the Application

To run the full application, you need to start both the backend server and the frontend development server.

1.  **Start the Backend Server**
    ```bash
    node server.js
    ```
    *Server runs on:* `http://localhost:3000`

2.  **Start the Frontend** (in a new terminal)
    ```bash
    npm run dev
    ```
    *Frontend runs on:* `http://localhost:5173` (or the port shown in your terminal)

## 📁 Project Structure

```
krishi-mitra/
├── public/              # Static assets
├── scripts/             # Build scripts
├── server/              # Alternative server setup (if applicable)
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context (Auth, Farm, Language)
│   ├── pages/           # Application pages (Dashboard, Home, etc.)
│   ├── services/        # API services
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Entry point
├── .env                 # Environment variables
├── config.json          # Backend configuration
├── server.js            # Main backend server
├── vite.config.js       # Vite configuration
└── package.json         # Project dependencies
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## 📄 License

This project is licensed under the MIT License.
