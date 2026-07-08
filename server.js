const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const PDFDocument = require('pdfkit'); // ✅ SIRF EK BAAR

dotenv.config();

const app = express();

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

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

console.log('✅ Models registered: User, Trip, Expense');

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
        console.error('Auth error:', err.message);
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
        console.log(`📊 Fetching trips for user: ${req.user._id}`);
        const trips = await Trip.find({ userId: req.user._id }).sort({ startDate: -1 });
        console.log(`📊 Found ${trips.length} trips`);
        res.json(trips);
    } catch (err) {
        console.error('Error fetching trips:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trips', auth, async (req, res) => {
    try {
        console.log('📝 Creating trip for user:', req.user._id);
        console.log('📝 Trip data:', req.body);
        
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
        console.log(`🗑️ Deleting trip: ${req.params.id}`);
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
        console.log('📝 Creating expense:', req.body);
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
// ✅ PDFDocument already declared at top

// Generate Trip Summary PDF
app.get('/api/trips/:tripId/pdf', auth, async (req, res) => {
    try {
        const tripId = req.params.tripId;
        
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        const expenses = await Expense.find({ tripId: tripId, userId: req.user._id });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - totalSpent;
        const pct = Math.round((totalSpent / trip.budget) * 100);
        
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });
        const filename = `trip-summary-${trip.destination}-${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        doc.pipe(res);
        
        // ============ COLORS ============
        const colors = {
            primary: '#F5A623',
            secondary: '#333333',
            text: '#444444',
            light: '#888888',
            border: '#DDDDDD',
            success: '#22C55E',
            danger: '#EF4444',
            warning: '#F97316'
        };
        
        // ============ HEADER ============
        doc.fontSize(28)
           .fillColor(colors.primary)
           .text('TravelOS', { align: 'center' });
        
        doc.fontSize(20)
           .fillColor(colors.secondary)
           .text(`Trip Summary: ${trip.destination}`, { align: 'center' });
        
        doc.moveDown(0.5);
        
        // Divider line
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .strokeColor(colors.border)
           .stroke();
        doc.moveDown();
        
        // ============ TRIP DETAILS ============
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('📋 Trip Details', { underline: true });
        doc.moveDown(0.3);
        
        doc.fontSize(11)
           .fillColor(colors.text)
           .text(`Destination: ${trip.destination}`)
           .text(`Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`)
           .text(`Travellers: ${trip.travellers}`)
           .text(`Travel Type: ${trip.travelType}`)
           .text(`Total Budget: ₹${trip.budget.toLocaleString()}`);
        
        doc.moveDown();
        
        // ============ BUDGET SUMMARY ============
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('💰 Budget Summary', { underline: true });
        doc.moveDown(0.3);
        
        // Budget cards
        const cardWidth = 150;
        const cardHeight = 50;
        const cardSpacing = 20;
        const startX = 50;
        let cardY = doc.y;
        
        // Card 1: Total Spent
        doc.rect(startX, cardY, cardWidth, cardHeight)
           .fillColor('#fef2f2')
           .fill();
        doc.rect(startX, cardY, cardWidth, cardHeight)
           .strokeColor(colors.danger)
           .stroke();
        doc.fontSize(10)
           .fillColor(colors.text)
           .text('Total Spent', startX + 10, cardY + 8);
        doc.fontSize(16)
           .fillColor(colors.danger)
           .text(`₹${totalSpent.toLocaleString()}`, startX + 10, cardY + 28);
        
        // Card 2: Remaining
        const card2X = startX + cardWidth + cardSpacing;
        doc.rect(card2X, cardY, cardWidth, cardHeight)
           .fillColor('#f0fdf4')
           .fill();
        doc.rect(card2X, cardY, cardWidth, cardHeight)
           .strokeColor(colors.success)
           .stroke();
        doc.fontSize(10)
           .fillColor(colors.text)
           .text('Remaining', card2X + 10, cardY + 8);
        doc.fontSize(16)
           .fillColor(colors.success)
           .text(`₹${remaining.toLocaleString()}`, card2X + 10, cardY + 28);
        
        // Card 3: Budget Used
        const card3X = card2X + cardWidth + cardSpacing;
        doc.rect(card3X, cardY, cardWidth, cardHeight)
           .fillColor('#fefce8')
           .fill();
        doc.rect(card3X, cardY, cardWidth, cardHeight)
           .strokeColor(colors.warning)
           .stroke();
        doc.fontSize(10)
           .fillColor(colors.text)
           .text('Budget Used', card3X + 10, cardY + 8);
        doc.fontSize(16)
           .fillColor(colors.warning)
           .text(`${pct}%`, card3X + 10, cardY + 28);
        
        doc.moveDown(3);
        
        // ============ PROGRESS BAR ============
        const barWidth = 450;
        const barHeight = 25;
        const barX = 50;
        const barY = doc.y + 5;
        
        // Background
        doc.rect(barX, barY, barWidth, barHeight)
           .fillColor('#f3f4f6')
           .fill();
        doc.rect(barX, barY, barWidth, barHeight)
           .strokeColor(colors.border)
           .stroke();
        
        // Fill
        const fillWidth = Math.min((pct / 100) * barWidth, barWidth);
        const fillColor = pct > 80 ? colors.danger : pct > 60 ? colors.warning : colors.success;
        doc.rect(barX, barY, fillWidth, barHeight)
           .fillColor(fillColor)
           .fill();
        
        // Percentage text
        doc.fontSize(12)
           .fillColor('#ffffff')
           .text(`${pct}%`, barX + (barWidth/2) - 20, barY + 5);
        
        doc.moveDown(2.5);
        
        // ============ CATEGORY BREAKDOWN ============
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('📊 Category Breakdown', { underline: true });
        doc.moveDown(0.3);
        
        const catColors = {
            food: '#F97316',
            hotel: '#8B5CF6',
            transport: '#06B6D4',
            shopping: '#EC4899',
            entertainment: '#22C55E',
            medical: '#EF4444',
            flight: '#3B82F6',
            others: '#6B7280'
        };
        
        const catNames = {
            food: 'Food',
            hotel: 'Hotel',
            transport: 'Transport',
            shopping: 'Shopping',
            entertainment: 'Entertainment',
            medical: 'Medical',
            flight: 'Flight',
            others: 'Others'
        };
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);
        
        let catY = doc.y;
        sortedCategories.forEach(([cat, amount]) => {
            const label = catNames[cat] || cat;
            const catPct = Math.round((amount / totalSpent) * 100);
            
            // Category name and amount
            doc.fontSize(11)
               .fillColor(colors.text)
               .text(`${label}:`, 50, catY);
            doc.fontSize(11)
               .fillColor(colors.secondary)
               .text(`₹${amount.toLocaleString()} (${catPct}%)`, 150, catY);
            
            // Mini progress bar
            const miniBarX = 250;
            const miniBarY = catY + 3;
            const miniBarWidth = 280;
            const miniBarHeight = 12;
            
            doc.rect(miniBarX, miniBarY, miniBarWidth, miniBarHeight)
               .fillColor('#f3f4f6')
               .fill();
            doc.rect(miniBarX, miniBarY, (catPct / 100) * miniBarWidth, miniBarHeight)
               .fillColor(catColors[cat] || '#6B7280')
               .fill();
            
            catY += 22;
        });
        
        doc.moveDown();
        
        // ============ RECENT EXPENSES ============
        if (expenses.length > 0) {
            doc.fontSize(14)
               .fillColor(colors.primary)
               .text('📝 Recent Expenses', { underline: true });
            doc.moveDown(0.3);
            
            // Table header
            const tableY = doc.y;
            doc.fontSize(10)
               .fillColor(colors.light)
               .text('Date', 50, tableY)
               .text('Description', 120, tableY)
               .text('Category', 350, tableY)
               .text('Amount', 450, tableY);
            
            doc.moveTo(50, tableY + 15)
               .lineTo(550, tableY + 15)
               .strokeColor(colors.border)
               .stroke();
            
            let rowY = tableY + 25;
            const recentExpenses = expenses.slice(-10).reverse();
            recentExpenses.forEach((e, index) => {
                if (rowY > 700) {
                    doc.addPage();
                    rowY = 50;
                }
                
                const catLabel = catNames[e.category] || e.category;
                const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
                
                doc.rect(50, rowY - 3, 500, 18)
                   .fillColor(bgColor)
                   .fill();
                
                doc.fontSize(9)
                   .fillColor(colors.text)
                   .text(new Date(e.date).toLocaleDateString(), 50, rowY)
                   .text(e.description.substring(0, 30), 120, rowY)
                   .text(catLabel, 350, rowY)
                   .text(`₹${e.amount.toLocaleString()}`, 450, rowY);
                
                rowY += 20;
            });
            
            if (expenses.length > 10) {
                doc.fontSize(9)
                   .fillColor(colors.light)
                   .text(`... and ${expenses.length - 10} more expenses`, 50, rowY + 5);
            }
        }
        
        // ============ FOOTER ============
        doc.moveDown(2);
        doc.fontSize(9)
           .fillColor(colors.light)
           .text(`Generated on ${new Date().toLocaleString()} | TravelOS`, { align: 'center' });
        
        doc.end();
        
        console.log(`✅ PDF generated: ${filename}`);
        
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});
// Generate Expenses List PDF
app.get('/api/trips/:tripId/expenses-pdf', auth, async (req, res) => {
    try {
        const tripId = req.params.tripId;
        
        const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        const expenses = await Expense.find({ tripId: tripId, userId: req.user._id })
            .sort({ date: -1 });
        
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        const doc = new PDFDocument({ margin: 50 });
        const filename = `expenses-${trip.destination}-${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(24)
           .fillColor('#F5A623')
           .text('TravelOS', { align: 'center' });
        
        doc.fontSize(16)
           .fillColor('#333')
           .text(`Expense Report: ${trip.destination}`, { align: 'center' });
        
        doc.fontSize(12)
           .fillColor('#666')
           .text(`Total Expenses: ${expenses.length} | Total Amount: ₹${totalSpent.toLocaleString()}`, { align: 'center' });
        
        doc.moveDown();
        
        // Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 180;
        const col3 = 300;
        const col4 = 400;
        
        doc.fontSize(11)
           .fillColor('#F5A623')
           .text('Date', col1, tableTop)
           .text('Description', col2, tableTop)
           .text('Category', col3, tableTop)
           .text('Amount', col4, tableTop);
        
        doc.moveTo(50, tableTop + 20)
           .lineTo(550, tableTop + 20)
           .strokeColor('#ccc')
           .stroke();
        
        let y = tableTop + 30;
        const categories = {
            food: 'Food', hotel: 'Hotel', transport: 'Transport',
            shopping: 'Shopping', entertainment: 'Entertainment',
            medical: 'Medical', flight: 'Flight', others: 'Others'
        };
        
        expenses.forEach((e, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            
            const catLabel = categories[e.category] || e.category;
            doc.fontSize(10)
               .fillColor('#333')
               .text(new Date(e.date).toLocaleDateString(), col1, y)
               .text(e.description.substring(0, 25), col2, y)
               .text(catLabel, col3, y)
               .text(`₹${e.amount.toLocaleString()}`, col4, y);
            
            y += 20;
            
            if (index % 2 === 0) {
                doc.rect(50, y - 20, 500, 20)
                   .fillColor('#f9f9f9')
                   .fill();
            }
        });
        
        // Total Row
        if (expenses.length > 0) {
            y += 10;
            doc.fontSize(11)
               .fillColor('#F5A623')
               .text('TOTAL', col2, y)
               .text(`₹${totalSpent.toLocaleString()}`, col4, y);
        }
        
        doc.end();
        
        console.log(`✅ Expenses PDF generated: ${filename}`);
        
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ STATIC FILES SERVE ============
app.use(express.static(path.join(__dirname)));

// SPA fallback - sab se neeche
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

// ============ EMAIL NOTIFICATIONS ============
const nodemailer = require('nodemailer');

// Email transporter configuration with better error handling
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true, // Debug mode on
    logger: true // Logging on
});

// Verify transporter connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter error:', error);
    } else {
        console.log('✅ Email transporter ready to send messages');
    }
});

// Send budget alert email
app.post('/api/email/budget-alert', auth, async (req, res) => {
    try {
        const { tripId, userEmail, userName, tripDestination, spent, budget, pct } = req.body;
        
        console.log('📧 Sending budget alert email to:', userEmail);
        
        const remaining = budget - spent;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `⚠️ Budget Alert: ${tripDestination} Trip`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #F5A623, #FF6B35); border-radius: 10px 10px 0 0;">
                        <h1 style="color: #fff; margin: 0;">🚨 Budget Alert</h1>
                    </div>
                    <div style="padding: 20px; background: #fff; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333;">Hello ${userName},</h2>
                        <p style="color: #555; font-size: 16px;">Your <strong>${tripDestination}</strong> trip budget is at <strong style="color: ${pct > 80 ? '#EF4444' : '#F97316'};">${pct}%</strong> usage!</p>
                        
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 5px 0;"><strong>Total Budget:</strong> ₹${budget.toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>Total Spent:</strong> ₹${spent.toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>Remaining:</strong> ₹${remaining.toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>Budget Used:</strong> ${pct}%</p>
                        </div>
                        
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 0; color: #92400e;">
                                💡 <strong>Tip:</strong> ${pct > 80 ? 'You need to control your spending! Consider cutting non-essential expenses.' : 'Keep an eye on your spending to stay within budget.'}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="https://travelos-neon.vercel.app/" style="background: #F5A623; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Your Trip
                            </a>
                        </div>
                        
                        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
                            This email was sent automatically from TravelOS.
                        </p>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Budget alert email sent to ${userEmail}`);
        console.log('📧 Message ID:', info.messageId);
        res.json({ message: 'Email sent successfully', messageId: info.messageId });
        
    } catch (err) {
        console.error('❌ Email Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send trip summary email
app.post('/api/email/trip-summary', auth, async (req, res) => {
    try {
        const { userEmail, userName, trip } = req.body;
        const expenses = await Expense.find({ tripId: trip._id, userId: req.user._id });
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - totalSpent;
        const pct = Math.round((totalSpent / trip.budget) * 100);
        
        console.log('📧 Sending trip summary email to:', userEmail);
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `📊 Trip Summary: ${trip.destination}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #F5A623, #FF6B35); border-radius: 10px 10px 0 0;">
                        <h1 style="color: #fff; margin: 0;">📊 Trip Summary</h1>
                    </div>
                    <div style="padding: 20px; background: #fff; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333;">${trip.destination}</h2>
                        <p style="color: #666; font-size: 14px;">${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}</p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666;">Budget</div>
                                <div style="font-size: 20px; font-weight: bold; color: #22C55E;">₹${trip.budget.toLocaleString()}</div>
                            </div>
                            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666;">Spent</div>
                                <div style="font-size: 20px; font-weight: bold; color: #EF4444;">₹${totalSpent.toLocaleString()}</div>
                            </div>
                            <div style="background: #fefce8; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666;">Remaining</div>
                                <div style="font-size: 20px; font-weight: bold; color: #F97316;">₹${remaining.toLocaleString()}</div>
                            </div>
                            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 12px; color: #666;">Used</div>
                                <div style="font-size: 20px; font-weight: bold; color: #3B82F6;">${pct}%</div>
                            </div>
                        </div>
                        
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 0;"><strong>Total Expenses:</strong> ${expenses.length}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="https://travelos-neon.vercel.app/" style="background: #F5A623; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Full Report
                            </a>
                        </div>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Trip summary email sent to ${userEmail}`);
        console.log('📧 Message ID:', info.messageId);
        res.json({ message: 'Email sent successfully', messageId: info.messageId });
        
    } catch (err) {
        console.error('❌ Email Error:', err);
        res.status(500).json({ error: err.message });
    }
});
        


// ============ SOCIAL LOGIN ============
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'travelos_session_secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialize/Deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://travelos-mkpn.onrender.com/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
            // Create new user
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: 'google_' + Math.random().toString(36).slice(2, 10),
                isGoogleUser: true
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'https://travelos-mkpn.onrender.com/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails ? profile.emails[0].value : profile.id + '@facebook.com';
        let user = await User.findOne({ email: email });
        if (!user) {
            user = new User({
                name: profile.displayName,
                email: email,
                password: 'facebook_' + Math.random().toString(36).slice(2, 10),
                isFacebookUser: true
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// Google Auth Routes
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET || 'travelos_secret_key',
            { expiresIn: '7d' }
        );
        res.redirect(`https://travelos-neon.vercel.app/auth-callback?token=${token}&name=${req.user.name}`);
    }
);

// Facebook Auth Routes
app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET || 'travelos_secret_key',
            { expiresIn: '7d' }
        );
        res.redirect(`https://travelos-neon.vercel.app/auth-callback?token=${token}&name=${req.user.name}`);
    }
);