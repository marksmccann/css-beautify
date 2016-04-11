/**
 * beautifies css
 * @author: Mark McCann <www.markmccann.me>
 * @license: MIT
 */

var cssBeautify = (function(){

    /**
     * extends object
     */
    var extend = function () {
        var a = arguments;
        for( var i = 1; i < a.length; i++ )
            for( var key in a[i] )
                if(a[i].hasOwnProperty(key))
                    a[0][key] = a[i][key];
        return a[0];
    }

    /**
     * regex
     */
    var regex = {
        ruleset: {
            // isolating css rule from entire sheet
            // $1:(comment|anything but braces|forward slash)1+{(comment|paren|string|anything but braces|forward slash)}
            rule: /((?:\/\*(?:(?!\*\/)(?:.|\n))*\*\/|(?:[^{}\/]))+){((?:(?:\/\*(?:(?!\*\/)(?:.|\n))*\*\/|\([^)]*\)|["'][^'"]*['"]|[^{}\/])*))}/g,
            // isolates individual selectors from ruleset
            // (comment|string|anything but open brace|comma)1+(comma|end of string)
            selector: /(\/\*((?!\*\/)(.|\n))*\*\/|["'][^'"]*['"]|[^{,])+(,|$)/g,
            // isolating the selector parts from individual selectors
            // ((attribute|pseudo|(class|id|element))atrule|at rule paren|comment|operator)
            part: /\s*(([\w-_.#]*\[\s*[\w-_]+\s*[~$|*\^]?=\s*(["']?[^'"]*['"]?)+\]|::?[\w-]*(\([^)]*\))?|[.#]?[\w-_]+)+|@[\w-]+|\([\w-]+\s*:\s*[\w.]*\)|\/\*((?!\*\/)(.|\n))*\*\/|[>+~])/g,
            // isolate each line/declaration from block
            // property:((paren|string|anything but semicolon|forward slash)0+;?(optional same line comment)|comment)
            line: /\s*([*_]?[\w-]+\s*:(\([^)]*\)|["'][^'"]*['"]|[^;/*])*;?( *\/\*((?!\*\/).)*\*\/)*|\/\*((?!\*\/)(.|\n))*\*\/)/g,
            // isolate value from a declaration
            // (anything but colon|forward slash|paren|string)0+comments?
            value: /([^:/]|\([^)]*\)|["'][^\"']*['"]|)*;?( *\/\*((?!\*\/).)*\*\/)*\s*$/
        },
        atrules: {
            // isolate @rules from entire sheet
            // $1:((comment)0+@atrule(string|paren|word)1+(semicolon)?){$2:((comment|string|anything but open brace){(comment|paren|string|anything but braces})0+})0+)}
            rule: /((?:\/\*(?:(?!\*\/)(?:.|\n))*\*\/\s*)*@(?:charset|font-face|import|keyframes|media|page)+(?:\s*(?:["'][^"']*['"]|\([^)]*\),?|\w+|[,]))+\s*[;{]?\s*)(?:(((\/\*((?!\*\/)(.|\n))*\*\/|["'][^'"]*['"]|[^{])+{(\/\*((?!\*\/)(.|\n))*\*\/|\([^)]*\)|["'][^'"]*['"]|[^{}\/])*})*\s*)})?/g,
            // isolates individual selectors from ruleset
            // (comment|string|anything but open brace|comma)1+(comma|end of string)
            selector: /(\/\*((?!\*\/)(.|\n))*\*\/|["'][^'"]*['"]|[^{,])+[,{;]/g,
            // isolating the selector parts from individual selectors
            // (@rule|media paren|url paren|string|word|comma)1+
            parts: /\s*(@[\w-]+|\([\w-]+\s*:\s*[\w.]*\)|url\(["'][^"']*["']\)|["'][^'"]*['"]|\w+|[,])/g
        }
    }

    /**
     * default settings for beautifier
     */
    var defaults = {
        // spaces for indentation
        indentation: '    ',
        // .class { ... }[here]
        afterRule: '\n\n',
        // .class,[here].class{
        afterSelector: '\n',
        // .class[here]{
        beforeOpenBrace: ' ',
        // /* comment */[here]
        afterComment: '\n\n',
        // font-family: arial,[here]sans-serif;
        afterComma: ' ',
        // :nth-child([here]...[here])
        parenPadding: '',
        // [here]{indent}property: value;
        beforeDeclaration: '\n',
        // property[here]: value;
        afterProperty: '',
        // property:[here]value;
        beforeValue: ' ',
        // property: value;[here]} 
        afterDeclarations: '\n',
        // double (") or single (') quotes
        quoteType: '\'',
        // @media {{beforeDeclaration}{indent}[here]...[here]{afterDeclarations}}
        atRulePadding: '\n',
        // force quotes around attribute selector values
        requireAttributeQuotes: true,
        // remove quotes around URL values
        removeURLQuotes: true,
        // #ffffff -> #fff
        shortenHex: true,
        // #FFF -> #fff
        lowercaseHex: true,
        // 0.45em -> .45em
        removeLeadingZero: true,
        // 0em -> 0
        removeZeroUnits: true,
        // adds semicolon to final declaration
        addLastSemiColon: true
    }

    /**
     * return the beautify function
     */
    return function( styles, options ) {
        // set minifier settings
        var settings = extend( defaults, options || {} );
        // time to do some formatting
        return styles
            // rulesets
            .replace( regex.ruleset.rule, function( rule, selectors, block ) {
                // whole selector
                return selectors
                    // individual selectors
                    .replace( regex.ruleset.selector, function( selector ) {
                        return selector
                            // selector parts
                            .replace( regex.ruleset.part, function( part ) {
                                return part
                                    // one space after each part
                                    .replace( /^\s*/, ' ' )
                                    // space inside parenthesis
                                    .replace( /\(\s*/g, '('+settings.parenPadding )
                                    .replace( /\s*\)/g, settings.parenPadding+')' )
                                    // remove space from inside attribute selectors
                                    .replace( /\[\s*/g, '[')
                                    .replace( /\s*\]/g, ']')
                                    // remove space from around attribute qualifier
                                    .replace( /\s*([~$|*\^]?=)\s*/g, '$1')
                                    // add quotes around attribute value if required
                                    .replace( /(\[[\w-_]+[~$|*\^]?=)([^'"\]]+)]/g, (settings.requireAttributeQuotes?'$1\'$2\'\]':'$1$2\]') )
                                    // update quotes to match setting
                                    .replace( /["']/g, settings.quoteType )
                            })
                            // space before each selector
                            .replace( /^\s*/, settings.afterSelector )
                            // remove any trailing spaces before comma
                            .replace( /\s*,\s*$/, ',')
                    })
                    // space after comments
                    .replace( /(\/\*((?!\*\/)(.|\n))*\*\/)\s*/g, '$1'+settings.afterComment )
                    // space after selectors, before open brace
                    .replace( /\s*$/, settings.beforeOpenBrace )
                    // remove space from before ruleset
                    .replace( /^\s*/, '' )
                // content of ruleset
                + '{' + block
                    // each declaration/line
                    .replace( regex.ruleset.line, function(line) {
                        return line
                            // property
                            .replace( /^\s*[*_]?[\w-]+\s*/, function(property){
                                return property
                                    // space after property, before colon
                                    .replace( /\s*$/, settings.afterProperty )
                            })
                            // value
                            .replace( regex.ruleset.value, function(value){
                                return value
                                    // space before value, after colon
                                    .replace( /^\s*/, settings.beforeValue )
                                    // space after commas
                                    .replace( /\s*,\s*/g, ','+settings.afterComma)
                                    // space before !important
                                    .replace(/\s*(\!important)/, ' $1')
                                    // space before same-line comment
                                    .replace( / *(\/\*((?!\*\/).)*\*\/)/g, ' $1')
                                    // remove quotes from around url value if set
                                    .replace( /(url\(\s*)["']([^\)"']*)['"](\s*\))/g, (settings.removeURLQuotes?'$1$2$3':'$1\'$2\'$3') )
                                    // space inside parenthesis
                                    .replace( /\(\s*/g, '('+settings.parenPadding )
                                    .replace( /\s*\)/g, settings.parenPadding+')' )
                                    // update quotes to match setting
                                    .replace( /["']/g, settings.quoteType )
                                    // lowercase hexadecimals
                                    .replace(/#[\d\w]{3,6}/, function(hex){
                                        return settings.lowercaseHex ? hex.toLowerCase() : hex.toUpperCase();
                                    })
                                    // if semicolon is missing and setting is set, add final semicolon
                                    .replace(/([)'"%\w\d])((?:\s*\/\*((?!\*\/)(.|\n))*\*\/)*\s*)$/, '$1'+(settings.addLastSemiColon?';':'')+'$2')
                                    // shorten qualifying hexadecmials
                                    .replace(/(#([\w\d])\2([\w\d])\3([\w\d])\4)/g, (settings.shortenHex?'#$2$3$4':'$1') )
                                    // add or remove leading zero if setting set
                                    .replace( /0?(\.\d+(em|ex|%|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax))\b/g, (settings.removeLeadingZero?'':'0')+'$1' )
                                    // remove units on zeros if setting set
                                    .replace( /\b0(em|ex|%|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax)\b/g, '0'+(settings.removeZeroUnits?'':'$1') )
                                    // remove any space from before closing semicolon
                                    .replace(/\s*;$/, ';');
                            })
                            // space before each declaration/line
                            .replace( /^\s*/, settings.beforeDeclaration+settings.indentation)
                    })
                    // space after last declaration, before closing brace
                    .replace( /\s*$/, settings.afterDeclarations )
                // closing brace and traling space
                + '}' + settings.afterRule;
            })
            // at rules
            .replace( regex.atrules.rule, function( rule, selector, block ) {
                // whole rule selector
                return selector
                    // individual selectors
                    // @rule split into parts
                    .replace( regex.atrules.parts, function( parts ) {
                        return parts
                            // one space before each part
                            .replace( /^\s*/, ' ' )
                            // space inside parenthesis
                            .replace( /\(\s*/g, '('+settings.parenPadding )
                            .replace( /\s*\)/g, settings.parenPadding+')' )
                            // remove space from before any comma
                            .replace( /^\s*,$/, ',')
                    })
                    // remove any trailing spaces before semicolon
                    .replace( /\s*[;]\s*$/, ';')
                    // space after comments
                    .replace( /(\/\*((?!\*\/)(.|\n))*\*\/)\s*/g, '$1'+settings.afterComment )
                    // space after selectors, before open brace
                    .replace( /\s*{\s*$/, settings.beforeOpenBrace+'{' )
                // rule block if exists
                + ( typeof block !== 'undefined' ? ( block
                    // space before the first ruleset
                    .replace(/^\s*/, settings.beforeDeclaration+settings.atRulePadding)
                    // indent every new line
                    .replace(/\n(.+)/g, '\n'+settings.indentation+'$1')
                    // space after last ruleset
                    .replace(/\s*$/, settings.afterDeclarations+settings.atRulePadding)
                // closing brace and trailing space
                + '}') : '') + settings.afterRule;
            })
            // trim string
            .trim();
    }

})();