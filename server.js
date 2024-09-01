const cors = require('cors'); // Import the cors package
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const moment = require('moment');

const app = express();
// Serve static files from the "public" directory
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

const pdfPath = "/Users/prathammeghnani/Documents/Vymo/POCs/ColdMailerPro/Pratham's_Resume_SDE1.pdf";
const pdfFile = fs.readFileSync(pdfPath);

const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'prathammeghani19@gmail.com',
        pass: 'gzjx sbqq hafm mdcv'
    }
});

const uri = 'mongodb+srv://prathammeghani19:HhbmJZUDxbnOve2j@cluster0.209ft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

app.post('/save-email-in-db', async (req, res) => {
    const { recipentName, companyName, jobPosition, specificArea, yourName, recipientEmail, cronDatetime } = req.body;
    const processed = false;

    if (!recipentName || !companyName || !jobPosition || !specificArea || !yourName || !recipientEmail || !cronDatetime) {
        return res.status(400).send('Missing required fields');
    }

    try {
        await client.connect();
        const database = client.db('Mission22');
        const collection = database.collection('coldmailer');
        const result = await collection.insertOne({ recipentName, companyName, recipientEmail, jobPosition, specificArea, yourName, processed });
        console.log('Document inserted:', result.insertedId);

        // Convert datetime to cron expression
        const cronExpression = moment(cronDatetime).format('m H D M d');
        cron.schedule(cronExpression, processEmails);

        res.status(200).send('Document saved successfully and cron job scheduled');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    } finally {
        await client.close();
    }
});

async function processEmails() {
    try {
        await client.connect();
        const database = client.db('Mission22');
        const collection = database.collection('coldmailer');

        const documents = await collection.find({ processed: false }).toArray();

        for (const doc of documents) {
            const { recipentName, companyName, jobPosition, specificArea, yourName, recipientEmail } = doc;

            const mailDetails = {
                from: 'prathammeghnani19@gmail.com',
                to: recipientEmail,
                subject: `REFERRAL REQUEST for ${jobPosition} at ${companyName}`,
                html: `Hi ${recipentName},<br><br>
                I hope you're doing well. I'm reaching out to express my interest in ${companyName} and to inquire if there are any open positions that align with my skills and experience.<br><br>
                I have 1.5 years of experience as a Member of Technical Staff at Vymo Technologies, where I worked extensively with <b>Java</b>, <b>Spring Boot</b>, <b>Node.js</b>, <b>JavaScript</b>, <b>Kafka</b>, <b>Kubernetes</b>, <b>Docker</b>, <b>Ansible</b>, <b>Angular</b>, and <b>Grafana</b>. I'm passionate about ${specificArea}, and I believe my background would make me a strong fit for ${companyName}.<br><br>
                If there are any relevant openings, I would greatly appreciate the opportunity to discuss how I can contribute to your team.<br><br>
                Best regards,<br>${yourName}`,
                attachments: [
                    {
                        filename: "Pratham's_Resume_SDE1.pdf",
                        content: pdfFile
                    }
                ]
            };

            await mailTransporter.sendMail(mailDetails);
            await collection.updateOne({ _id: doc._id }, { $set: { processed: true } });
            console.log(`Email sent to ${recipentName} (${recipientEmail}) and marked as processed.`);
        }
    } catch (error) {
        console.error('Error processing emails:', error);
    } finally {
        await client.close();
    }
}

const port = 6969;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});