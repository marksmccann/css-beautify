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
     * default settings for beautifier
     */
    var defaults = {
        indent: '    ',
        afterRule: '\n\n',
        afterSelector: ' ',
        afterCommas: '\n',
        afterComments: '\n\n',
        afterCharset: '\n\n',
        beforeQueryClose: '\n\n',
        afterQueryOpen: '\n\n',
        afterFirstComment: '\n\n',
        lastSemiColon: true
    }

    /**
     * return the beautify function
     */
    return function( styles, options ) {
        // set minifier settings
        var settings = extend( defaults, options || {} );
        // time to do some formatting
        return styles
            // formatting the content for each individual rule
            .replace(/{(([^{}("']*([("'][^\'")]*[\'")])?[^{}("']*)*)}\s*/g,function(contents){
                return contents
                    // get each individual line to format
                    .replace(/([\w\s-]*:([^;'"(}])*(\(["']?[^'")]*['"]?\)|["'][^'"]*['"])?([^;}])*;?( *\/\*((?!\*\/)(.|\n))*\*\/)*|\s*\/\*((?!\*\/)(.|\n))*\*\/)/g, function(line){
                        return line
                            // wrap and indent each declaration
                            .replace(/^\s*([\w-]*)\s*:\s*(.*)/, '\n'+settings.indent+'$1: $2')
                            // wrap and indent stand-alone comments
                            .replace(/^\s*(\/\*(.|\n)*)/, '\n'+settings.indent+'$1')
                            // add a space between the end of a declaration and same-line comment
                            .replace(/; *(\/\*(.|\n)*)/, '; $1')
                            // format space between last declaration and comment 
                            .replace(/([)'"%\w\d]) *(\/\*(.|\n)*)$/, '$1 $2')
                            // if semicolon is missing and add semicolon if setting is set
                            .replace(/([)'"%\w\d])((?:\s*\/\*((?!\*\/)(.|\n))*\*\/)*\s*)$/, '$1'+(settings.lastSemiColon?';':'')+'$2');
                    })
                    // remove any space at end of rule and replace 
                    // with a single new line
                    .replace( /\s*}\s*$/, '\n}'+settings.afterRule )
            })
            // formatting each selector
            .replace( /[^{}]*(\/\*((?!\*\/)(.|\n))*\*\/)*[^{}]*{\n/g, function(selector){
                return selector
                    // one space between selector and opening bracket
                    .replace(/\s*{\n$/, settings.afterSelector+'{\n')
                    // isolate the selector from any spaces or comments before it
                    .replace(/[^\/]*{\n$/, function(s){
                        // new line or space after each comma
                        return s.replace(/\s*,\s*/g,','+settings.afterCommas)
                    })
                    // put comments on own line
                    .replace(/(\/\*((?!\*\/)(.|\n))*\*\/)\s*/g, '$1'+settings.afterComments)
                    
            })
            // formatting for queries with nested rules
            .replace(/{([^{}]*{[^}]*})*\s*}\s*/g, function(query){
                return query
                    // define the space after the opening bracket
                    .replace(/^{\s*/, '{'+settings.afterQueryOpen)
                    // indent every new line
                    .replace(/\n(.+)/g, '\n'+settings.indent+'$1')
                    // define the space after the opening bracket
                    .replace(/\s*}\s*$/, settings.beforeQueryClose+'}'+settings.afterRule)
            })
            // formatting for @charset
            .replace(/\s*(@charset *["'][\w\d-]*['"];)\s*/, '$1'+settings.afterCharset)
            // formatting for the first comment of the page
            .replace(/^(\s*\/\*((?!\*\/)(.|\n))*\*\/\s*)/, '$1'+settings.afterFirstComment)
            // trim the spaces from the beginning and end
            .trim();
    }

})();