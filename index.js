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

async function generateToken(userId) {
    let futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const sessionToken = userId + futureDate.getMilliseconds();

    const hashedToken = await new Promise((resolve, reject) => {
        bcrypt.genSalt(10, function(err, tokenSalt) {
            bcrypt.hash(sessionToken, tokenSalt, function (err, hashedToken) {
                resolve(hashedToken);
            })
        })
    })

    return [hashedToken, futureDate]
}

router.post('/login', jsonParser, async (req, res) => {
    const { email, hash } = req.body;
    console.log(email, hash);

    if(await isUnique(email)) return;

    userModel.findOne({ email: email, hash: hash }, async function(err, user) {
        console.log(err, user);
        const userId = user.get('_id');
        const [hashedToken, futureDate] = await generateToken(userId);
        await userModel.findByIdAndUpdate(userId, { token: { token: hashedToken, expiry: futureDate } });

        res.json({ success: true, token: hashedToken, expiry: futureDate });
    });
    res.json({ success: false });
})

function isUnique(email) {
    return new Promise((resolve, reject) => {
        userModel.countDocuments({ email: email }, function(err, count) {
            resolve(count === 0);
        });
    })
}

router.post('/isUnique', jsonParser, async (req, res) => {
    const { email } = req.body;
    res.json({ unique: await isUnique(email) });
})

router.post('/addUser', jsonParser, async (req, res) => {
    const { email, hash } = req.body;

    if(!(await isUnique(email))) return;

    const userId = new mongoose.Types.ObjectId();
    const [hashedToken, futureDate] = await generateToken(userId);
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
            console.log('Created account.')
            res.json({ success: true, token: hashedToken, expiry: futureDate });
        })
        .catch(error => {
            console.error(error);
            res.json({ success: false });
        })
})

app.use(bodyParser.json())
app.use(cors({ credentials: true, origin: true }));
app.use('', router);

app.listen(PORT, () => {
    console.log(`API running at https://localhost:${PORT}`);
})
