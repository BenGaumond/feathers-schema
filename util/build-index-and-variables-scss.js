//So, what's this?
//Well, it's a dry run for a styling workflow I came up with that I'd like to
//Try out. Basically, styles has an index.js which can be used by react for
//colors and variables for computed styling. That index.js is ALSO used to build
//the index.scss (which I prefer to main.scss) so that in the end, the css
//is using the same values without having to write them in two places.

//Furthermore, this combes the component heirarchy, looking for scss files and
//adding them into the index.scss. I'd prefer to have my component styles right
//next to the components.

//I'm imagining a fully featured version of this script would have some kind of
//watch functionality

import fs from 'fs'
import path from 'path'

//TODO maybe this comes from an argument, or something
const isoDir = path.resolve(__dirname, '../src-iso/')
const stylesDir = path.join(isoDir, 'styles')

//Get the js data
const { variables, colors } = require(stylesDir)


/******************************************************************************/
// Build _variables.scss
/******************************************************************************/
let variablesScss = '', char = null

const combined = {...variables, ...colors}

for (const i in combined) {
  const v = combined[i]
  const value = typeof v === 'object' ? v.value : v
  const units = typeof v === 'object' ? v.units || '' : ''
  const name = unCamelCase(i)

  if (name[0] !== char && char !== null)
    variablesScss += '\n'

  variablesScss += `$${name}: ${value}${units};\n`

  char = name[0]
}

console.log('_variables.scss'), console.log(variablesScss)
fs.writeFileSync(path.join(stylesDir, '_variables.scss'), variablesScss, 'utf-8')

/******************************************************************************/
// Build index.scss
/******************************************************************************/
let indexScss = '@import "./variables";\n'

const styleDirScssFiles = fs.readdirSync(stylesDir).filter(f => f.includes('.scss') && f !== 'index.scss' && f !== '_variables.scss')
styleDirScssFiles.forEach(fn => addScssImportStatement(path.join(stylesDir, fn)))

indexScss += '\n'

addScssImportsFromDir(path.join(isoDir, 'pages'))
addScssImportsFromDir(path.join(isoDir, 'components'))

console.log('index.scss'), console.log(indexScss)
fs.writeFileSync(path.join(stylesDir, 'index.scss'), indexScss, 'utf-8')

/******************************************************************************/
// Helper
/******************************************************************************/

function addScssImportsFromDir(url) {

  const fof = fs.readdirSync(url)

  fof.forEach(f => {
    const ff = path.join(url,f)
    const stat = fs.statSync(ff)

    const isDir = stat.isDirectory()

    if (isDir)
      addScssImportsFromDir(ff)

    else if (f.includes('.scss'))
      addScssImportStatement(ff)

  })

}

function addScssImportStatement(file) {

  const _import = file.replace(stylesDir, '.')
    .replace(isoDir, '..')
    .replace(/_|(\.scss)/g,'')

  indexScss += `@import "${_import}";\n`
}

function unCamelCase(str, limiter = '-') {

  let cased = ''
  for (let i = 0, c = str[i]; i < str.length; c = str[++i])
    cased += /[A-Z]/.test(c) ? (i > 0 ? limiter : '') + c.toLowerCase() : c

  return cased.replace(/--/g, '-')
}
