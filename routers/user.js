const Util = require("../lib/util/Util");
const countries = require("i18n-iso-countries");
const router = require("express").Router();
const ago = require('s-ago');

let alphabet = "abcdefghijklmnopqrstuvwxyz";
let indicators = "🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿";

// general
router.get("/:query", async (req, res) => {
	let server = req.pools["server"];
	let web = req.pools["web"];
	let query = require("mysql2").escape(req.params.query);

	let [user, _] = await server.execute(`SELECT * FROM users WHERE (id = ${query} OR name LIKE ${query} OR safe_name LIKE ${query}) AND priv & 1`);

	if (!user[0])
		return res.status(404).render(".error", {
			error_name: "User not found...",
			error_message: "The user you were looking for was not found.<br>Maybe they were one of the following:<i><br>● was made unavaiable for security or abuse<br>● have changed their username<br>● or just doesn't exist</i>",
			title: "profiles"
		});

	let settings = (await web.execute(`SELECT * FROM user_settings WHERE id = ${user[0].id}`))[0][0] || {};
	let roles = settings.roles ? (await web.execute(`SELECT * FROM roles WHERE id IN (${settings.roles})`))[0] : [];

	roles = roles.sort((a, b) => b.priority - a.priority);

	console.log({
		created: new Date(user[0].creation_time * 1000),
		last: new Date(user[0].latest_activity * 1000)
	})
	res.status(200).render(".user", {
		user: user[0],
		title: user[0].name + "'s profile",
		country_code: user[0].country == "xx" ? null : getIndicators(user[0].country),
		country_name: user[0].country == "xx" ? null : countries.getName(user[0].country.toUpperCase(), "en", {select: "official"}),
		dates: {
			created: ago(new Date(user[0].creation_time * 1000)),
			last: ago(new Date(user[0].latest_activity * 1000))
		},
		role: roles[0] || null,
		roles: roles,
		user_settings: settings,
		followers: (await web.execute(`SELECT COUNT(*) FROM followers WHERE following = ${user[0].id}`))[0][0]["COUNT(*)"]
	});
})

function getIndicators(string) {
	let res = "";
	for (let letter of string.split("")) {
		let ind = alphabet.split("").findIndex(l => l == letter.toLowerCase()) * 2;
		res += indicators[ind] + indicators[ind + 1];
	}

	return res;
}

module.exports = router;