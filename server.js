const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const PDFDocument = require('pdfkit');

dotenv.config();

const app = express();

// ============ MIDDLEWARE - CRITICAL ORDER ============
// ✅ Body parser - SAB SE PEHLE (Render pe kaam karne ke liye)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ CORS ============
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// ✅ Handle preflight requests
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// ✅ Debug logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('📦 Body:', req.body);
    }
    next();
});

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
});

// ============ SCHEMAS ============
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const TripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    travellers: { type: Number, default: 1 },
    travelType: { type: String, enum: ['Solo', 'Friends', 'Family', 'Business'], default: 'Friends' },
    shareCode: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now }
});

const ExpenseSchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['food', 'hotel', 'transport', 'shopping', 'entertainment', 'medical', 'flight', 'others'], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

console.log('✅ Models registered: User, Trip, Expense');

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Register request body:', req.body);
        
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
        console.error('❌ Register error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('📝 Login request body:', req.body);
        
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
        console.error('❌ Login error:', err);
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
        console.error('❌ Auth error:', err.message);
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
        console.log(`📊 Found ${trips.length} trips for user ${req.user.email}`);
        res.json(trips);
    } catch (err) {
        console.error('Error fetching trips:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trips', auth, async (req, res) => {
    try {
        const trip = new Trip({ 
            ...req.body, 
            userId: req.user._id,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate)
        });
        const savedTrip = await trip.save();
        console.log(`✅ Trip created: ${savedTrip.destination} (ID: ${savedTrip._id})`);
        res.status(201).json(savedTrip);
    } catch (err) {
        console.error('Error creating trip:', err);
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/trips/:id', auth, async (req, res) => {
    try {
        const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        await Expense.deleteMany({ tripId: req.params.id });
        console.log(`✅ Trip deleted: ${trip.destination}`);
        res.json({ message: 'Trip deleted successfully' });
    } catch (err) {
        console.error('Error deleting trip:', err);
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
        console.log(`📊 Found ${expenses.length} expenses`);
        res.json(expenses);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses', auth, async (req, res) => {
    try {
        const expense = new Expense({ 
            ...req.body, 
            userId: req.user._id,
            date: new Date(req.body.date)
        });
        const savedExpense = await expense.save();
        console.log(`✅ Expense added: ${savedExpense.description} (${savedExpense.amount})`);
        res.status(201).json(savedExpense);
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        console.log(`✅ Expense deleted: ${expense.description}`);
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

// ============ PDF GENERATION ============
app.get('/api/trips/:tripId/pdf', auth, async (req, res) => {
    try {
        const tripId = req.params.tripId;
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        
        const expenses = await Expense.find({ tripId: tripId, userId: req.user._id });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - totalSpent;
        const pct = Math.round((totalSpent / trip.budget) * 100);
        
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `trip-summary-${trip.destination}-${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).fillColor('#F5A623').text('TravelOS', { align: 'center' });
        doc.fontSize(18).fillColor('#333').text(`Trip Summary: ${trip.destination}`, { align: 'center' });
        doc.moveDown();
        
        // Trip Details
        doc.fontSize(14).fillColor('#555').text('Trip Details', { underline: true });
        doc.fontSize(11).fillColor('#333')
           .text(`Destination: ${trip.destination}`)
           .text(`Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`)
           .text(`Travellers: ${trip.travellers}`)
           .text(`Travel Type: ${trip.travelType}`)
           .text(`Total Budget: ₹${trip.budget.toLocaleString()}`);
        doc.moveDown();
        
        // Budget Summary
        doc.fontSize(14).fillColor('#555').text('Budget Summary', { underline: true });
        doc.fontSize(11).fillColor('#333')
           .text(`Total Spent: ₹${totalSpent.toLocaleString()}`)
           .text(`Remaining: ₹${remaining.toLocaleString()}`)
           .text(`Budget Used: ${pct}%`);
        
        // Category Breakdown
        doc.moveDown();
        doc.fontSize(14).fillColor('#555').text('Category Breakdown', { underline: true });
        
        const catNames = {
            food: 'Food', hotel: 'Hotel', transport: 'Transport',
            shopping: 'Shopping', entertainment: 'Entertainment',
            medical: 'Medical', flight: 'Flight', others: 'Others'
        };
        
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([cat, amount]) => {
            const label = catNames[cat] || cat;
            const catPct = Math.round((amount / totalSpent) * 100);
            doc.fontSize(11).fillColor('#333')
               .text(`${label}: ₹${amount.toLocaleString()} (${catPct}%)`);
        });
        
        doc.moveDown();
        
        // Recent Expenses
        if (expenses.length > 0) {
            doc.fontSize(14).fillColor('#555').text('Recent Expenses', { underline: true });
            const recentExpenses = expenses.slice(-10).reverse();
            recentExpenses.forEach(e => {
                const catLabel = catNames[e.category] || e.category;
                doc.fontSize(10).fillColor('#333')
                   .text(`• ${e.description} | ${catLabel} | ₹${e.amount.toLocaleString()} | ${new Date(e.date).toLocaleDateString()}`);
            });
        }
        
        doc.end();
        console.log(`✅ PDF generated: ${filename}`);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trips/:tripId/expenses-pdf', auth, async (req, res) => {
    try {
        const tripId = req.params.tripId;
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        
        const expenses = await Expense.find({ tripId: tripId, userId: req.user._id }).sort({ date: -1 });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        const doc = new PDFDocument({ margin: 50 });
        const filename = `expenses-${trip.destination}-${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);
        
        doc.fontSize(24).fillColor('#F5A623').text('TravelOS', { align: 'center' });
        doc.fontSize(16).fillColor('#333').text(`Expense Report: ${trip.destination}`, { align: 'center' });
        doc.fontSize(12).fillColor('#666').text(`Total Expenses: ${expenses.length} | Total Amount: ₹${totalSpent.toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        let y = doc.y + 20;
        const categories = {
            food: 'Food', hotel: 'Hotel', transport: 'Transport',
            shopping: 'Shopping', entertainment: 'Entertainment',
            medical: 'Medical', flight: 'Flight', others: 'Others'
        };
        
        doc.fontSize(10).fillColor('#555');
        doc.text('Date', 50, y - 10);
        doc.text('Description', 150, y - 10);
        doc.text('Category', 320, y - 10);
        doc.text('Amount', 450, y - 10);
        
        y += 10;
        doc.moveTo(50, y).lineTo(550, y).strokeColor('#ccc').stroke();
        y += 15;
        
        expenses.forEach((e) => {
            if (y > 700) { doc.addPage(); y = 50; }
            const catLabel = categories[e.category] || e.category;
            doc.fillColor('#333')
               .text(new Date(e.date).toLocaleDateString(), 50, y)
               .text(e.description.substring(0, 25), 150, y)
               .text(catLabel, 320, y)
               .text(`₹${e.amount.toLocaleString()}`, 450, y);
            y += 20;
        });
        
        doc.end();
        console.log(`✅ Expenses PDF generated: ${filename}`);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ EMAIL NOTIFICATIONS (DISABLED) ============
console.log('📧 Email notifications disabled (Render free tier limitation)');

app.post('/api/email/budget-alert', auth, async (req, res) => {
    console.log('📧 Mock email - Budget Alert:', req.body);
    res.json({ 
        message: 'Email feature temporarily disabled',
        note: 'Upgrade to paid tier or use SendGrid'
    });
});

app.post('/api/email/trip-summary', auth, async (req, res) => {
    console.log('📧 Mock email - Trip Summary:', req.body);
    res.json({ 
        message: 'Email feature temporarily disabled',
        note: 'Upgrade to paid tier or use SendGrid'
    });
});

// ============ TRIP SHARING ============

// Generate shareable link
app.get('/api/trips/:tripId/share', auth, async (req, res) => {
    try {
        console.log('📤 Generating share link for trip:', req.params.tripId);
        
        const tripId = req.params.tripId;
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        // Generate unique share code
        const shareCode = Buffer.from(`${tripId}_${Date.now()}`).toString('base64').slice(0, 20);
        
        // Save share code to trip
        trip.shareCode = shareCode;
        await trip.save();

        const shareUrl = `https://travelos-neon.vercel.app/shared-trip/${shareCode}`;
        
        console.log('✅ Share link generated:', shareUrl);
        
        res.json({
            shareUrl,
            shareCode,
            trip: {
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                budget: trip.budget,
                travellers: trip.travellers,
                travelType: trip.travelType
            }
        });
    } catch (err) {
        console.error('❌ Error generating share link:', err);
        res.status(500).json({ error: err.message });
    }
});

// View shared trip (public)
app.get('/api/shared-trip/:shareCode', async (req, res) => {
    try {
        console.log('📥 Fetching shared trip with code:', req.params.shareCode);
        
        const shareCode = req.params.shareCode;
        
        // Find trip by shareCode
        const trip = await Trip.findOne({ shareCode });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        // Get expenses for this trip
        const expenses = await Expense.find({ tripId: trip._id });
        
        res.json({
            trip: {
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                budget: trip.budget,
                travellers: trip.travellers,
                travelType: trip.travelType
            },
            expenses: expenses.map(e => ({
                description: e.description,
                amount: e.amount,
                category: e.category,
                date: e.date
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching shared trip:', err);
        res.status(500).json({ error: err.message });
    }
});
// ============ EXCEL EXPORT ============
const XLSX = require('xlsx');

// Generate Excel file for expenses
app.get('/api/trips/:tripId/excel', auth, async (req, res) => {
    try {
        const tripId = req.params.tripId;
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        const expenses = await Expense.find({ tripId: tripId, userId: req.user._id }).sort({ date: -1 });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - totalSpent;
        const pct = Math.round((totalSpent / trip.budget) * 100);

        // Category totals
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        // ============ CREATE EXCEL ============
        const workbook = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            ['TravelOS - Trip Expense Report'],
            [],
            ['Trip Details'],
            ['Destination', trip.destination],
            ['Start Date', new Date(trip.startDate).toLocaleDateString()],
            ['End Date', new Date(trip.endDate).toLocaleDateString()],
            ['Travellers', trip.travellers],
            ['Travel Type', trip.travelType],
            [],
            ['Budget Summary'],
            ['Total Budget', trip.budget],
            ['Total Spent', totalSpent],
            ['Remaining', remaining],
            ['Budget Used', pct + '%'],
            [],
            ['Category Breakdown'],
            ['Category', 'Amount', 'Percentage']
        ];

        Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, amount]) => {
                const catPct = Math.round((amount / totalSpent) * 100);
                summaryData.push([cat, amount, catPct + '%']);
            });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // 2. Expenses Sheet
        const expenseData = [
            ['Date', 'Description', 'Category', 'Amount (₹)', 'Trip']
        ];

        expenses.forEach(e => {
            expenseData.push([
                new Date(e.date).toLocaleDateString(),
                e.description,
                e.category,
                e.amount,
                trip.destination
            ]);
        });

        // Add total row
        expenseData.push(['', '', 'TOTAL', totalSpent, '']);

        const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

        // 3. Daily Breakdown Sheet
        const dailyTotals = {};
        expenses.forEach(e => {
            const date = new Date(e.date).toLocaleDateString();
            dailyTotals[date] = (dailyTotals[date] || 0) + e.amount;
        });

        const dailyData = [
            ['Date', 'Spent', 'Category-wise Expenses']
        ];

        const dailyCategories = {};
        expenses.forEach(e => {
            const date = new Date(e.date).toLocaleDateString();
            if (!dailyCategories[date]) dailyCategories[date] = {};
            dailyCategories[date][e.category] = (dailyCategories[date][e.category] || 0) + e.amount;
        });

        Object.entries(dailyTotals).forEach(([date, total]) => {
            const cats = dailyCategories[date] || {};
            const catStr = Object.entries(cats)
                .map(([cat, amt]) => `${cat}: ₹${amt}`)
                .join(', ');
            dailyData.push([date, total, catStr]);
        });

        const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Breakdown');

        // ============ GENERATE EXCEL FILE ============
        const filename = `expenses-${trip.destination}-${Date.now()}.xlsx`;
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);

        console.log(`✅ Excel generated: ${filename}`);

    } catch (err) {
        console.error('Excel Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});
// ============ STATIC FILES SERVE - SAB SE NECHE ============
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'N/A'}`);
    console.log(`🔐 JWT: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`📦 Models: User, Trip, Expense`);
    console.log('='.repeat(50));
});