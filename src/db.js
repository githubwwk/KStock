var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/kStock');

var Schema = mongoose.Schema;

var stockSchema = new Schema({
  date: Date,
  data: String,  
});

var TWSE = mongoose.model('TWSE', stockSchema);
var FG = mongoose.model('FG', stockSchema);
var FUT = mongoose.model('FUT', stockSchema);
var BROKER = mongoose.model('BROKER', stockSchema);


// create a new user
/*
var newUser = User({
  name: 'Konrad Wei',
  username: 'Konrad',
  password: 'password',
  admin: true
});
*/
// save the user
/*
newUser.save(function(err) {
  if (err) throw err;

  console.log('User created!');
});
*/
exports.dbSave = function(type, dataObj)
{
  switch(type)
  {
    case 'TWSE':
          var newTWSE = TWSE(dataObj);
          newTWSE.save(function(err){
            console.log('TWSE Created Done');
          });
    break;
    case 'FG_MAJOR':
          var newFG = FG(dataObj);
          newFG.save(function(err){
            console.log('FG Created Done');
          });    
    break;
    case 'FUT':
          var newFUT = FUT(dataObj);
          newFUT.save(function(err){
            console.log('FUT Created Done');
          });      
    break;
    case 'BROKER':
          var newBROKER = BROKER(dataObj);
          newBROKER.save(function(err){
            console.log('BROKER Created Done');
          });      
    break;
    default:
           console.log('New Type:' + type);
          var StockDB = mongoose.model(type, stockSchema);                  
          var newStockType = StockDB(dataObj);
          newStockType.save( function(err){
            console.log('Created Done: ' + type);
          });          
          console.log("Special type:" + type);
  }

};