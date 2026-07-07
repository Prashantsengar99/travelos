const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path'); // ✅ IMPORTANT - Upar lao

dotenv.config();

const app = express();

// ============ STATIC FILES SERVE ============
// ✅ Ye code sabse upar aana chahiye
app.use(express.static(path.join(__dirname)));

// Serve index.html on root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ CORS ============
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// ============ MONGODB CONNECTION ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://thakurprashant9720_db_user:b3ykaKUV3EhYEux5@cluster0.9dsenb3.mongodb.net/travelos?retryWrites=true&w=majority&appName=Cluster0';

console.log('📊 Connecting to MongoDB Atlas...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
})
.then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // process.exit(1) hatana hai taaki server crash na ho
});

// ============ SCHEMAS (MODELS) ============

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Trip Schema
const TripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    travellers: { type: Number, default: 1 },
    travelType: { type: String, enum: ['Solo', 'Friends', 'Family', 'Business'], default: 'Friends' },
    createdAt: { type: Date, default: Date.now }
});

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['food', 'hotel', 'transport', 'shopping', 'entertainment', 'medical', 'flight', 'others'], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Trip = mongoose.model('Trip', TripSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        console.log(`✅ New user registered: ${email}`);
        
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'travelos_secret_key',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            user: { id: user._id, name: user.name, email: user.email },
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log(`✅ User logged in: ${email}`);
        
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'travelos_secret_key',
            { expiresIn: '7d' }
        );
        
        res.json({
            user: { id: user._id, name: user.name, email: user.email },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ AUTH MIDDLEWARE ============

const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travelos_secret_key');
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        res.status(500).json({ error: err.message });
    }
};

// ============ TRIPS ============

app.get('/api/trips', auth, async (req, res) => {
    try {
        const trips = await Trip.find({ userId: req.user._id }).sort({ startDate: -1 });
        console.log(`📊 Fetched ${trips.length} trips for user ${req.user.email}`);
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trips', auth, async (req, res) => {
    try {
        const trip = new Trip({ ...req.body, userId: req.user._id });
        await trip.save();
        console.log(`✅ Trip created: ${trip.destination} for ${req.user.email}`);
        res.status(201).json(trip);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/trips/:id', auth, async (req, res) => {
    try {
        const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        await Expense.deleteMany({ tripId: req.params.id });
        console.log(`🗑️ Trip deleted: ${trip.destination}`);
        res.json({ message: 'Trip deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ EXPENSES ============

app.get('/api/expenses', auth, async (req, res) => {
    try {
        const { tripId } = req.query;
        const filter = { userId: req.user._id };
        if (tripId) filter.tripId = tripId;
        const expenses = await Expense.find(filter).sort({ date: -1 });
        console.log(`📊 Fetched ${expenses.length} expenses for trip ${tripId || 'all'}`);
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses', auth, async (req, res) => {
    try {
        const expense = new Expense({ ...req.body, userId: req.user._id });
        await expense.save();
        console.log(`✅ Expense added: ${expense.description} (${expense.amount})`);
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        console.log(`🗑️ Expense deleted: ${expense.description}`);
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ EXPENSE SUMMARY ============

app.get('/api/expenses/summary/:tripId', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ tripId: req.params.tripId, userId: req.user._id });
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        const byCategory = {};
        const byDay = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
            const date = new Date(e.date).toISOString().split('T')[0];
            byDay[date] = (byDay[date] || 0) + e.amount;
        });
        res.json({ total, byCategory, byDay, expenses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ ANALYTICS ============

app.get('/api/analytics/:tripId', auth, async (req, res) => {
    try {
        const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user._id });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        
        const expenses = await Expense.find({ tripId: req.params.tripId, userId: req.user._id });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - totalSpent;
        const pct = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;
        
        const byCategory = {};
        const byDay = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
            const date = new Date(e.date).toISOString().split('T')[0];
            byDay[date] = (byDay[date] || 0) + e.amount;
        });
        
        res.json({
            trip,
            totalSpent,
            remaining,
            pct,
            byCategory,
            byDay,
            expenses,
            dailyAverage: expenses.length > 0 ? totalSpent / expenses.length : 0,
            totalDays: Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ PACKING ============

app.get('/api/packing/:tripId', auth, async (req, res) => {
    try {
        const defaultItems = [
            { id: 1, text: 'Passport / ID Card', done: false },
            { id: 2, text: 'Clothes (3-4 sets)', done: false },
            { id: 3, text: 'Shoes / Sandals', done: false },
            { id: 4, text: 'Power Bank', done: false },
            { id: 5, text: 'Phone Charger', done: false },
            { id: 6, text: 'Medicines', done: false },
            { id: 7, text: 'Toiletries', done: false },
            { id: 8, text: 'Sunscreen', done: false },
            { id: 9, text: 'Umbrella', done: false },
            { id: 10, text: 'Camera', done: false }
        ];
        res.json({ items: defaultItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/packing/:tripId', auth, async (req, res) => {
    try {
        res.json({ items: req.body.items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ WEATHER API ============

app.get('/api/weather/:city', async (req, res) => {
    try {
        const city = req.params.city;
        const apiKey = process.env.WEATHER_API_KEY || 'your_api_key_here';
        
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
        );
        
        const forecastData = await forecastResponse.json();
        
        const dailyForecast = [];
        const processedDays = new Set();
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toISOString().split('T')[0];
            
            if (!processedDays.has(day) && dailyForecast.length < 5) {
                processedDays.add(day);
                dailyForecast.push({
                    date: day,
                    day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
                    temp_min: Math.round(item.main.temp_min),
                    temp_max: Math.round(item.main.temp_max),
                    description: item.weather[0].description,
                    icon: item.weather[0].icon,
                    humidity: item.main.humidity,
                    wind_speed: Math.round(item.wind.speed * 3.6),
                    pop: Math.round(item.pop * 100)
                });
            }
        });
        
        res.json({
            current: {
                city: currentData.name,
                country: currentData.sys.country,
                temp: Math.round(currentData.main.temp),
                feels_like: Math.round(currentData.main.feels_like),
                description: currentData.weather[0].description,
                icon: currentData.weather[0].icon,
                humidity: currentData.main.humidity,
                wind_speed: Math.round(currentData.wind.speed * 3.6),
                pressure: currentData.main.pressure,
                sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString('en-IN'),
                sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString('en-IN'),
                visibility: currentData.visibility / 1000
            },
            forecast: dailyForecast
        });
        
    } catch (err) {
        console.error('Weather API Error:', err.message);
        res.status(500).json({ 
            error: err.message,
            message: 'Unable to fetch weather data' 
        });
    }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: mongoose.connection.db?.databaseName || 'unknown',
        timestamp: new Date().toISOString()
    });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'N/A'}`);
    console.log(`🔐 JWT: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log('='.repeat(50));
});