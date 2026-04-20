import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 8086;
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'voting-service' });
});
app.listen(PORT, () => {
    console.log(`Voting Service is running on port ${PORT}`);
});
