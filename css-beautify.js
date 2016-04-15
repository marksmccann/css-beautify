/**
 * beautifies css
 * @author: Mark McCann <www.markmccann.me>
 * @license: MIT
 */

var cssBeautify = (function(){

    var TokenStream = function( input ) {
        this.str = input.split('');
        this.cursor = 0;
        this.string = '';
        this.position = 'root';
    }

    TokenStream.prototype.current = function() {
        return this.str[ this.cursor ];
    }

    TokenStream.prototype.next = function( amount ) {

        for( var i=0; i<(amount || 1); i++ ) {
            this.cursor++;
        }

        return this;

    };

    TokenStream.prototype.move = function( amount ) {

        for( var i=0; i<(amount || 1); i++ ) {
            this.add().next();
        }

        return this;

    };

    TokenStream.prototype.peek = function( lookAhead, includeCurrent ) {

        var string = '';

        if( lookAhead < 0 ) {

            for( var i=(includeCurrent?0:1); i<=(lookAhead*-1 || 1); i++ ) {

                var key = this.cursor - i;

                if( key >= 0 ) {

                    string += this.str[ key ];

                } else {

                    break;

                }

            }

        } else {

            for( var i=(includeCurrent?0:1); i<=(lookAhead || 1); i++ ) {

                var key = this.cursor + i;

                if( key <= this.str.length-1 ) {

                    string += this.str[ key ];

                } else {

                    break;

                }

            }

        }

        return string;

    };

    TokenStream.prototype.add = function() {
        if( typeof this.current() != 'undefined' ) {
            this.string += this.current();
        }
        return this;
    };

    TokenStream.prototype.eof = function() {
        return this.cursor >= this.str.length;
    }

    TokenStream.prototype.concat = function( string ) {
        this.string += string;
        return this;
    }

    TokenStream.prototype.iterate = function( callback, condition ) {
        var i = 0;
        // stop iterating when (1) end of file is reached
        // (2) if infinitely looping (3) optional passed-in
        // condition is not met
        while( (condition||function(){return 1;}).call(this) && !this.eof() && i<this.str.length*2 ) {
            callback.call(this, i);
            i++;
        }
        return this;
    }

    /**
     * compares 'a' to current char or optionally, peek a number of characters 
     * forward or backwards. returns true if there is a match.
     * @param {string|regex} a
     * @param {integer} b
     * @return {boolean}
     */
    TokenStream.prototype.is = function( a, b ) {
        return (new RegExp(a)).test( (typeof b!='undefined'?this.peek(b):this.current()) );
    }

    // returns true if the next (non-space) character matches the one provided
    // forecast
    TokenStream.prototype.anticipate = function( character, includeCurrent ) {
        var i = 1;
        var lastChar = ' ';
        while( /\s/.test( lastChar ) ) {
            lastChar = this.peek(i, (includeCurrent||false)).substr(i-1);
            i++;
        }
        return (new RegExp(character)).test(lastChar);
    };

    TokenStream.prototype.consume = function( condition ) {
        // move the cursor until the condition is met
        this.iterate( function(){
            this.move();
        }, condition);
        return this;
    };

    TokenStream.prototype.eat = function( match ) {
        // move the cursor until the condition is met
        this.consume( function(){ 
            return !this.is(match);
        });
        return this;
    };

    TokenStream.prototype.skip = function( condition ) {
        // move the cursor until the condition is met
        this.iterate( function(){
            this.next();
        }, condition);
        return this;
    };

    TokenStream.prototype.at = function( position ) {
        return (new RegExp(position)).test(this.position);
    };

    TokenStream.prototype.change = function( position, move ) {
        this.position = position;
        if( move ) this.move();
        return this;
    };

    TokenStream.prototype.spaces = function() {
        this.skip(function() {
            // if the current char is a space character
            return this.is('\\s');
        });
        return this;
    }

    var settings = {
        // indentation
        indent: '    ',
        // space after each declaration
        // display: block;[here] | /* ... */[here]
        afterDeclaration: '\n',
        // space after individual, 
        // comma-separated selectors
        afterSelector: '\n',
        // space after rules
        // .class { ... }[here] & /* ... */[here]
        afterRule: '\n\n',
        // additional space after open brace
        // and before closing brace
        // @media ... {[afterDec..][here] ... [here]}
        atRulePadding: '\n',
        // after selectors 
        afterSelectors: ' ',
        // preferred quote type
        quoteType: "'",
        // lowercase hexadecimals
        lowercaseHex: true,
        // shorten hexadecmials
        shortenHex: true,
        // adds final semi-colon if missing
        finalSemiColon: true,
        // remove zeros from decimals 
        removeLeadingZeros: true,
        // remove units from zero values
        removeZeroUnits: true,
        // method to run when beautifier starts
        onStart: function(){},
        // method to run when beautifier completes
        onComplete: function(){},
        // method to run every time the tool iterates
        onIteration: function(){}
    }

    var tokenize = function(input) {

        var token = new TokenStream(input);

        settings.onStart.call(this);

        token.iterate(function(){

            // local var for brevity
            var t = this;

            // forward slash --------------------------------------------

            if( t.is('\\/') ) {

                // start of a comment
                if( t.is('\\*',1) ) {

                    // eat characters until end of comment
                    t.consume(function() {

                        // look forward to see if we're at
                        // the close of the comment
                        return this.peek(1, true) != '*/';

                    }).move(2);

                    // if @ 'root' level
                    // /* ... */[here] .class {...}
                    if( t.at('root') ) {

                        // add space after comment
                        t.concat(settings.afterRule);

                        // if @ '@-root' level add indent as well
                        if( t.at('^@') && !t.anticipate('}') ) {
                            t.concat(settings.indent);
                        }

                    }

                    // else if @ 'rule-property' level
                    // { /* ... */[here] display: block; ... }
                    else if( t.position == 'rule-property' ) {

                        // add space after declaration
                        t.concat( settings.afterDeclaration );
                        
                        // if were not at the end of the 
                        // rule yet, add an indentation
                        if( !t.anticipate('}') ) {
                            t.concat(settings.indent);
                        }

                    // else @ any other level, to avoid infinitely 
                    // looping, just move forward
                    } else { t.move(); }

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // at sign --------------------------------------------

            if( t.is('@') ) {

                // if @ 'root' level
                // @[here]...;
                if( t.at('root') ) {

                    // change stream position
                    t.change('@-start', true);

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // comma --------------------------------------------

            if( t.is(',') ) {

                // if @ 'rule-start' level
                // .class,[here].class { ...
                if( t.at('rule-start') ) {

                    // add space after comma separated selector
                    t.move().concat( settings.afterSelector );

                    // if @ '@-rule-start' level add indent 
                    // and remove any following spaces
                    if( t.at('^@') ) {

                        // concat indent to string and remove spaces
                        t.concat(settings.indent).spaces();

                    }

                // if @ 'rule-value' or '@-rule-value' level
                // ... font-family: Arial,[here] ...
                } else if( t.at('rule-value') ) {

                    // move cursor after comma,
                    // skip any spaces and add space
                    t.move().spaces().concat(' ');

                // if @ '@-start' level
                // @import "..." screen,[here] projection;
                } else if( t.position == '@-start' ) {

                    // add a space after @-rule commas
                    t.move().concat(' ');

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // open bracket --------------------------------------------

            if( t.is('\\[') ) {

                // eat characters until closing bracket 
                // or the start of a string
                t.iterate(function(){

                    // if a space, skip it, else consume it
                    this[(this.is('\\s')?'next':'move')]();

                // condition for iterate method
                }, function(){ 

                    // match closing bracket or quote
                    return !this.is('["\'\\]]');

                });

            }

            // close bracket --------------------------------------------

            if( t.is('\\]') ) {

                // to avoid infinitely looping, 
                // move forward one
                t.move();

            }

            // open paren --------------------------------------------

            if( t.is('\\(') ) {

                // eat characters until closing paren 
                // or the start of a string
                t.iterate(function(){

                    // if a space, skip it, else consume it
                    if( this.is('\\s') ) this.next();
                    else this.move();

                // condition for iterate method
                }, function(){ 

                    // match closing paren or quote
                    return !this.is('["\'\\)]');

                });

            }

            // close paren --------------------------------------------

            if( t.is('\\)') ) {

                // if @ '@-start' level
                // @import url("...")[here];
                if( t.at('@-start') ) {

                    // determine whether or not we are 
                    // reaching the of an at rule line
                    // before moving forward
                    var end = t.anticipate(';');

                    // move forward and skip any spaces
                    t.move().spaces();

                    // if not at the end, add a space
                    // before the next property
                    if( !end ) t.concat(' ');

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // open double quotes --------------------------------------------

            if( t.is('\\"') ) {

                // quote type
                var quote = settings.quoteType;

                // see if we are dealing with a charset
                // so I can force the quotes to be double
                if( t.at('@-start') && /tesrahc@/i.test(t.peek(-10)) ) {
                    quote = '"';
                }

                // add the quote, according to setting
                // and move forward past it
                t.concat( quote ).next();

                // eat characters until the matching quote
                t.eat('\\"');

                // add the correct quote quote
                // and move past quote
                t.concat( quote ).next();

            }

            // open single quotes --------------------------------------------

            if( t.is("'") ) {

                // quote type
                var quote = settings.quoteType;

                // see if we are dealing with a charset
                // so I can force the quotes to be double
                if( t.at('@-start') && /tesrahc@/i.test(t.peek(-10)) ) {
                    quote = '"';
                }

                // add the quote, according to setting
                // and move forward past it
                t.concat( quote ).next();

                // eat characters until the matching quote
                t.eat("\\'");

                // add the correct quote quote
                // and move past quote
                t.concat( quote ).next();

            }

            // 0 --------------------------------------------------------

            if( t.is('0') ) {

                // if @ 'rule-start' or '@-rule-start' level
                // span-[here]0 { ...
                if( t.at('rule-start') ) {

                    // see if the start of the rule is next
                    var end = t.anticipate('{');

                    // move the cursor foward
                    t.move();

                    // if we're at the end, remove any spaces 
                    // and replace with settings
                    if( end ) {
                        t.spaces().concat( settings.afterSelectors );
                    } 

                // if @ 'rule-value' level
                // ... margin: 0[here]; ...
                } else if( t.at('rule-value') ) {

                    // look forward 4 chracters to see 
                    // what we're dealing with
                    var peek = t.peek(4);

                    // if the trailing chars match a unit of measurement and 
                    // the previous is not a digit as well
                    // match -> 0px | no match -> 10px
                    if( /^(em|ex|%|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax)/.test(peek) && !/\d/.test(t.peek(-1)) ) {

                        if( settings.removeZeroUnits ) {

                            //calculate the length of the measurement so
                            // we know how many places to skip
                            var length = peek.match(/^(em|ex|%|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax)/)[0].length;

                            // add the zero and then skip the measurement 
                            t.move().next(length);

                        } 

                    }

                    // if the following characters prove the zero
                    // prefaces a decimal value, skip the zero
                    else if( /^\.\d/.test(peek) ) {
                        if( settings.removeLeadingZeros ) t.next();
                    }

                    // if not either of the above exceptions,
                    // just add the zero and move forward like normal
                    else { t.move(); }

                } 

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                else { t.move(); }

            }

            // open brace --------------------------------------------

            if( t.is('\\{') ) {

                // if @ 'rule-start' or '@-rule-start' level
                // .class {[here] 
                if( t.at('rule-start') ) {

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change status to property level and move forward
                    t.change( (at?'@-':'')+'rule-property', true );

                    // if we're not at the end of the rule add the
                    // space for after a declaration and indent
                    if( !t.anticipate('}', true) ) {

                        // add space for after declaration and indentation
                        t.concat( settings.afterDeclaration+settings.indent );

                        // if inside an at rule, add an extra indent
                        if( at ) t.concat(settings.indent);

                    }

                // if @ '@-start' level
                // @screen screen ... {[here]
                } else if( t.at('@-start') ) {

                    // change status to @-root level and move forward
                    t.change( '@-root', true );

                    // if we're not the end of the rule add the
                    // space for after a declaration + at-rule padding + indent
                    if( !t.anticipate('}', true) ) {
                        t.concat( settings.afterDeclaration+settings.atRulePadding+settings.indent );
                    }
                
                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // close brace --------------------------------------------

            if( t.is('\\}') ) {

                // if @ 'rule-property' or'rule-value' in or out of at rule
                // note: rule property was included in case the last declaration
                // doesn't have a semicolon and it hasn't changed back to value
                // margin: 0; ... }[here]
                if( t.at('rule-property|rule-value') ) {

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change the position and move forward
                    t.change( (at?'@-':'')+'root', true );

                    // add space for after a rule
                    t.concat( settings.afterRule );

                    // if in at rule and we're at the end of the rule
                    // add another indentation
                    if( at && !t.anticipate('}') ) {
                        t.concat( settings.indent );
                    }

                // if @ '@-root' level
                // @media ... { ... }[here]
                } else if( t.at('@-root') ) {

                    // change position back to root level, move forward,
                    // and add appropriate space for after a rule
                    t.change( 'root', true ).concat( settings.afterRule );

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // hash --------------------------------------------

            if( t.is('#') ) {

                // if @ 'root' or '@-root' level
                // [here]#div { ...
                if( t.at('root') ) {

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change the position and move forward
                    t.change( (at?'@-':'')+'rule-start', true );

                // if @ 'rule-value' or '@-rule-value' level
                // ... color: #[here]ffffff; ...
                } else if( t.at('rule-value') ) {

                    // grab the potential hex value
                    // six chracters ahead
                    var peek = t.peek(6, true);

                    // placeholder to hold hex value
                    var hex = '';

                    // shorten qualifying hexadecmials
                    if( settings.shortenHex ) {
                        hex = peek.replace(/#([\w\d])\1([\w\d])\2([\w\d])\3/g, '#$1$2$3' );
                    }

                    // change hexadecimal letter case
                    if( settings.lowercaseHex ) {
                        hex = hex.toLowerCase();
                    }

                    // if six character hex, skip entire hex
                    // and concatonate the new one
                    if( /^#[a-fA-F\d]{6}$/.test(peek) ) {

                        t.next(7).concat( hex );

                    // if three character hex, skip three
                    // and concatonate the new one
                    } else if( /^#[a-fA-F\d]{3}\b/.test(peek) ) {

                        // truncate the end of the hex string 
                        // so we're only adding the hex part
                        t.next(4).concat( hex.slice(0,4) );

                    // if not a hex match, just move forward
                    } else { t.move(); }

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // colon --------------------------------------------

            if( t.is(':') ) {

                // if @ 'rule-property' or '@-rule-property' level
                // ... margin:[here] ...
                if( t.at('rule-property') ) {

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change the position and move forward
                    t.change( (at?'@-':'')+'rule-value', true );

                    // if the following character is not white space, add some
                    if( !t.is(' ') ) {
                        t.concat(' ');
                    }

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // semi-colon --------------------------------------------

            if( t.is(';') ) {

                // if @ 'rule-value' or '@-rule-value' level
                // ... margin: 0;[here] ...
                if( t.at('rule-value') ) {

                    // see if we have reached the end
                    // of the ruleset
                    var end = t.anticipate('}');

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change the position and move forward
                    t.change( (at?'@-':'')+'rule-property', true );

                    // skip any spaces following the semicolon
                    t.spaces();

                    // add space for after declaration
                    t.concat( settings.afterDeclaration );

                    // if we are not at the end, add
                    // indent to prep for next property
                    if( !end ) t.concat('    ');

                    // if in an at-rule, add an additional indent
                    if( at ) t.concat( settings.indent );

                // if @ '@start' level
                // @charset "UTF-8";[here]
                } else if( t.at('@-start') ) {

                    // change position, move forward, add after rule spacing
                    t.change('root', true).concat( settings.afterRule );

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // combinators --------------------------------------------

            if( t.is('[>~+]') ) {

                // if @ 'rule-start' or '@-rule-start' level
                // .class >[here] .class { ...
                if( t.at('rule-start') ) {

                    // if the previous character is 
                    // not a space, add one
                    if( !t.is('\s',-1) ) t.concat(' ');

                    // add the combinator without 
                    // moving the cursor ahead
                    t.add();

                    // if the next character is not
                    // a space, add one
                    if( !t.is('\s',1) ) t.concat(' ');

                    // move the cursor past the combinator
                    t.next();

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // white space --------------------------------------------

            if( t.is('\\s') ) {

                // if @ 'root'/'@-root' or @ 'rule-property'/'@-rule-property' levels
                // .class { } [here] .class { } or [here] display [here]: block; ...
                if( t.at('root') ||  t.at('rule-property') ) {

                    // skip any white space
                    t.spaces();

                // if @ 'rule-start' or '@-rule-start' level
                // .class [here] .class { ...
                } else if( t.at('rule-start') ) {

                    // see if 1) we are exiting a string, but still inside
                    // a paren or bracket 2) before a comma
                    var end = t.anticipate('[\\]\\),]');

                    // skip any spaces
                    t.spaces();

                    // if we are not at the end of the selector
                    // or not following a new line, add a space
                    if( !end && !/\n/.test(t.string.slice(-1)) ) t.concat(' ');

                // if @ 'rule-value' or '@-rule-value' level
                // margin: [here] 10px [here] 10px [here]; ...
                } else if( t.at('rule-value') ) {

                    // see if 1) we are exiting a string, but still inside
                    // a paren 2) before a semi-colon
                    var end = t.anticipate('[\\);]');

                    // skip any spaces
                    t.spaces();

                    // if we are not at the end of the value, add a space
                    if( !end ) t.concat(' ');

                }

                // if @ '@-start' level
                // @media [here] screen ... 
                else if( t.at('@-start') ) {

                    // see if 1) we are exiting a string, but still inside
                    // a paren or brackets 2) before a semi-colon or comma
                    var end = t.anticipate('[\\]\\),;]');

                    // skip any spaces
                    t.spaces();

                    // if we are not at the end of the rule, add a space
                    if( !end ) t.concat(' ');

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // words and digits --------------------------------------------

            if( t.is('[a-zA-Z1-9]') ) {

                // if @ 'root' or '@-root' level
                // [here] div { ...
                if( t.at('root') ) {

                    // determine whether or not we are 
                    // currently in an at rule
                    var at = t.at('^@');

                    // change the position and move forward and
                    // keep doing so if followed by more letters
                    t.change( (at?'@-':'')+'rule-start', true );

                    // continue to eat if single word
                    t.eat('[\\w\\-_]');

                // if @ 'rule-start' or '@-rule-start' level
                // d[here]iv { ...
                } else if( t.at('rule-start') ) {

                    // see if the start of the rule is next
                    var end = t.anticipate('{');

                    // move the cursor foward
                    t.move();

                    // if we're at the end, remove any spaces 
                    // and replace with settings
                    if( end ) {
                        t.spaces().concat( settings.afterSelectors );
                    }

                // if @ 'rule-value' or '@-rule-value' level
                // display: [here]block;
                } else if( t.at('rule-value') ) {

                    // if the end or ruleset is coming
                    var end = t.anticipate('}');

                    // move the cursor foward
                    t.move();

                    // if we're at the end, remove any spaces, 
                    // add optional semi-colon and add space
                    if( end ) {

                        // remove spaces
                        t.spaces();

                        // add missing semi-colon if set
                        if( settings.finalSemiColon ) t.concat(';');

                        // add trailing space
                        t.concat( settings.afterDeclaration );

                    }

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // asterisk --------------------------------------------

            if( t.is('\\*') ) {

                // if @ 'root' level
                // [here] div { ...
                if( t.at('^root') ) {

                    // change the position and move cursor
                    // and keep doing so if followed by more letters
                    t.change( 'rule-start', true );

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // period --------------------------------------------

            if( t.is('\\.') ) {

                // if @ 'root' level
                // [here] div { ...
                if( t.at('^root') ) {

                    // change the position and move cursor
                    // and keep doing so if followed by more letters
                    t.change( 'rule-start', true );

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

                // continue to eat if single word
                t.eat('[\\w\\-_]');

            }

            // exclamation point --------------------------------------------

            if( t.is('!') ) {

                // if @ 'rule-value' or '@-rule-value' level
                // [here]!important
                if( t.at('rule-value') ) {

                    // make sure this is an imporant
                    if( /important/.test(t.peek(9)) ) {

                        // if not prefaced by a space, add one
                        if( !/ /.test(t.peek(-1)) ) {
                            t.concat(' ');
                        }

                    }

                    // move forward
                    t.move();

                // else @ any other level, to avoid infinitely 
                // looping, just move forward
                } else { t.move(); }

            }

            // unused characters --------------------------------------------

            if( t.is('[`$%^\\-_=<?]') ) {

                // if a non-key character, just move forward
                t.move();

            }

            // run the iterate callback method
            settings.onIteration.call(this);


        });

        // run the completion callback method
        settings.onComplete.call(this);

        return token.string.trimRight();

    }

    return function(input, options) {

        return tokenize(input);

    }

})();