'use strict';

module.exports = Address;
////////////////////////////////////////////////////////////////////////////////
var Base58       = require('bs58');
var Bitcoin      = require('bitcoinjs-lib');
var WalletCrypto = require('./wallet-crypto');
var Helpers      = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
////////////////////////////////////////////////////////////////////////////////
// Address class
function Address(object){
  // private members
  var obj = object || {};
  this._addr  = obj.addr;
  this._priv  = obj.priv;
  this._label = obj.label;
  this._tag   = obj.tag || 0;  //default is non-archived
  this._created_time           = obj.created_time;
  this._created_device_name    = obj.created_device_name;
  this._created_device_version = obj.created_device_version;
  // non saved properties
  this._balance                = null; // updated from the server
}

// public members
Object.defineProperties(Address.prototype, {
  "address": {
    configurable: false,
    get: function() { return this._addr;}
  },
  "priv": {
    configurable: false,
    get: function() { return this._priv;}
  },
  "tag": {
    configurable: false,
    get: function() { return this._tag;}
  },
  "label": {
    configurable: false,
    get: function() { return this._label;},
    set: function(str) {
      if(Helpers.isValidLabel(str)) {
        this._label = str;
        MyWallet.syncWallet();
      }
      else
        { throw 'Error: address.label must be an alphanumeric string'; }
    }
  },
  "created_time": {
    configurable: false,
    get: function() {return this._created_time;}
  },
  "created_device_name": {
    configurable: false,
    get: function() {return this._created_device_name;}
  },
  "created_device_version": {
    configurable: false,
    get: function() {return this._created_device_version;}
  },
  "balance": {
    configurable: false,
    get: function() { return this._balance;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._balance = num;
      else
        throw 'Error: address.balance must be a number';
    }
  },
  "isWatchOnly": {
    configurable: false,
    get: function() { return this._priv == null;}
  },
  "archived": {
    configurable: false,
    get: function() { return this._tag === 2;},
    set: function(value) {
      if(Helpers.isBoolean(value)) {
        if (value) {this._tag = 2;} else {this._tag = 0;}
        MyWallet.syncWallet();
      }
      else
        { throw 'Error: address.archived must be a boolean';};
    }
  },
  "active": {
    configurable: false,
    get: function() { return !this.archived;},
    set: function(value) { this.archived = !value; }
  }
});

Address.factory = function(o,a){
  if (a instanceof Object && !(a instanceof Address)) {
    o[a.addr] = new Address(a);
  }
  else {
    o[a.addr] = a;
  };
  return o;
};

Address.import = function(key, label){
  var object = {
    addr                   : null,
    priv                   : null,
    created_time           : Date.now(),
    created_device_name    : APP_NAME,
    created_device_version : APP_VERSION
  };

  switch (true){
    case Helpers.isBitcoinAddress(key):
      object.addr = key;
      object.priv = null;
      break;
    case Helpers.isKey(key):
      object.addr = key.pub.getAddress().toString();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    case Helpers.isBitcoinPrivateKey(key):
      key = Bitcoin.ECKey.fromWIF(key)
      object.addr = key.pub.getAddress().toString();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    default:
      throw 'Error: address import format not supported';
  };

  //initialization
  var address = new Address(object);
  address.label    = label;
  address.archived = false;
  return address;
};

Address.new = function(label){
  var key = Bitcoin.ECKey.makeRandom(true);
  return Address.import(key, label);
};

Address.reviver = function(k,v){
  if (k === '') return new Address(v);
  return v;
}

Address.prototype.toJSON = function(){
  var address = {
    addr   : this.address,
    priv   : this.priv,
    tag    : this.tag,
    label  : this.label,
    created_time           : this.created_time,
    created_device_name    : this.created_device_name,
    created_device_version : this.created_device_version
  };
  return address;
};

Address.prototype.encrypt = function(cipher){
  var wo = this.isWatchOnly;
  var priv = wo? null : cipher(this._priv);
  if (!priv && !wo) { throw 'Error Encoding key'; };
  this._priv = priv;
  return this;
};

Address.prototype.decrypt = function(cipher){
  var wo = this.isWatchOnly;
  var priv = wo? null : cipher(this._priv);
  if (!priv && !wo) { throw 'Error Decoding key'; };
  this._priv = priv;
  return this;
};

// JSON serialization
// var a = Address.new();
// var json = JSON.stringify(a);
// var parsed = JSON.parse(json, Address.revive);
