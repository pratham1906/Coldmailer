const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const cors = require('cors'); // Import the cors package


const app = express();
// Serve static files from the "public" directory
app.use(cors()); // Enable CORS for all routes
app.use(express.static('public'));
app.use(express.json()); // For parsing application/json

const pdfPath = "/Users/prathammeghnani/Documents/Vymo/POCs/ColdMailerPro/Pratham's_Resume_SDE1.pdf";
const pdfFile = fs.readFileSync(pdfPath);

// Set up nodemailer transporter
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'prathammeghani19@gmail.com',
        pass: 'gzjx sbqq hafm mdcv' // Replace with your actual email password
    }
});

// MongoDB connection URI
const uri = 'mongodb+srv://prathammeghani19:HhbmJZUDxbnOve2j@cluster0.209ft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your MongoDB URI
const client = new MongoClient(uri);

// Endpoint to manually add documents
app.post('/save-email-in-db', async (req, res) => {
    const { recipentName, companyName, jobPosition, specificArea, yourName, recipientEmail } = req.body;
    const processed = false;
    if (!recipentName || !companyName || !jobPosition || !specificArea || !yourName || !recipientEmail) {
        return res.status(400).send('Missing required fields');
    }
    try {
        await client.connect();
        const database = client.db('Mission22');
        const collection = database.collection('coldmailer');
        const result = await collection.insertOne({ recipentName, companyName, recipientEmail, jobPosition, specificArea, yourName, processed });
        console.log('Document inserted:', result.insertedId);
        res.status(200).send('Document saved successfully');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    } finally {
        await client.close();
    }
});

// Function to send emails to unprocessed documents and update them
async function processEmails() {
    try {
        await client.connect();
        const database = client.db('Mission22');
        const collection = database.collection('coldmailer');

        // Fetch documents where processed is false
        const documents = await collection.find({ processed: false }).toArray();

        for (const doc of documents) {
            const { recipentName, companyName, jobPosition, specificArea, yourName, recipientEmail } = doc;

            // Email details
            const mailDetails = {
                from: 'prathammeghnani19@gmail.com',
                to: recipientEmail,
                subject: `REFERRAL REQUEST for ${jobPosition} at ${companyName}`,
                html: `Hi ${recipentName},<br><br>

    I hope you're doing well. I'm reaching out to express my interest in ${companyName} and to inquire if there are any open positions that align with my skills and experience.<br><br>

    I have 1.5 years of experience as a Member of Technical Staff at Vymo Technologies, where I worked extensively with <b>Java</b>, <b>Spring Boot</b>, <b>Node.js</b>, <b>JavaScript</b>, <b>Kafka</b>, <b>Kubernetes</b>, <b>Docker</b>, <b>Ansible</b>, <b>Angular</b>, and <b>Grafana</b>. I'm passionate about ${specificArea}, and I believe my background would make me a strong fit for ${companyName}.<br><br>

    If there are any opportunities available, I would greatly appreciate it if you could consider my profile or refer me to the appropriate person. I've attached my resume for your reference.<br><br>

    Thank you for your time, and I look forward to any advice or assistance you can offer.<br><br>

    Best regards,<br>
    ${yourName}`,
                attachments: [
                    {
                        filename: "Pratham's_Resume_SDE1.pdf",
                        content: pdfFile,
                        contentType: 'application/pdf'
                    }
                ]
            };

            // Send the email
            await mailTransporter.sendMail(mailDetails);
            console.log('Email sent to:', recipientEmail);

            // Update the document to mark it as processed
            await collection.updateOne({ _id: doc._id }, { $set: { processed: true } });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Schedule the task to run every day at 10 AM
cron.schedule('03 18 * * *', processEmails);

const PORT = process.env.PORT || 6969;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});