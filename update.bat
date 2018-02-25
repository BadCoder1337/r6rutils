git add .
git commit -m 'fix'
git push heroku master
heroku ps:scale web=1 --app r6rutils
heroku logs --tail --app r6rutils