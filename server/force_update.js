import mongoose from 'mongoose';
import Office from './models/Office.js';
import dotenv from 'dotenv';
dotenv.config();

async function forceUpdate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/radius-check');
        const office = await Office.findOne();
        if (office) {
            console.log('Found office, updating grace period to 5...');
            office.grace_period_mins = 5;
            await office.save();
            console.log('Update successful!');
            
            const updated = await Office.findOne();
            console.log(`New Grace Period: ${updated.grace_period_mins}`);
        } else {
            console.log('No office found.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

forceUpdate();
