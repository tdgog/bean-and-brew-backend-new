import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import bodyParser from "body-parser";

const app = express();
const router = express.Router();
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const jsonParser = bodyParser.json();
const PORT = 8000;

mongoose.set('strictQuery', false);
await mongoose.connect('mongodb://localhost:27017/bean-and-brew')
const userModel = mongoose.model('user', new mongoose.Schema({
    id: mongoose.Schema.ObjectId,
    email: String,
    hash: String,
    token: {
        token: String,
        expiry: Date
    }
}))

router.post('/isUnique', jsonParser, async (req, res) => {
    const { email } = req.body;
    userModel.countDocuments({ email: email }, function(err, count) {
        res.json({ unique: count === 0 });
    });
})

router.post('/addUser', jsonParser, async (req, res) => {
    const { email, hash } = req.body;

    // Create session token
    const userId = new mongoose.Types.ObjectId();
    let futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const sessionToken = userId + futureDate.getMilliseconds();
    bcrypt.genSalt(10, function(err, tokenSalt) {
        bcrypt.hash(sessionToken, tokenSalt, function (err, hashedToken) {
            const user = new userModel({
                _id: userId,
                email: email,
                hash: hash,
                token: {
                    token: hashedToken,
                    expiry: futureDate
                }
            })
            user.save()
                .then(result => {
                    res.json({ success: true, token: hashedToken, expiry: futureDate });
                })
                .catch(error => {
                    console.error(error);
                    res.json({ success: false });
                })
        })
    });
})

app.use(bodyParser.json())
app.use(cors({ credentials: true, origin: true }));
app.use('', router);

app.listen(PORT, () => {
    console.log(`API running at https://localhost:${PORT}`);
})
