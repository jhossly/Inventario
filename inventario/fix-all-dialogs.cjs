const fs = require('fs')
const path = require('path')

const filesToFix = [
  'src/pages/Proveedores.jsx',
  'src/pages/Productos.jsx',
  'src/pages/POS.jsx',
  'src/pages/Contactos.jsx',
  'src/pages/Categorias.jsx',
  'src/pages/GastosIngresos.jsx',
  'src/pages/AjusteStock.jsx',
  'src/components/VisualDocumentEditor.jsx',
  'src/components/DocumentDesigner.jsx',
]

filesToFix.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return

  let content = fs.readFileSync(fullPath, 'utf8')

  // Fix pattern: </div></div>{dialog.Dialog}
  content = content.replace(
    /<\/div><\/div>\s*\{dialog\.Dialog\}\s*\n\s*\)\s*\n\s*\}/g,
    '</div>\n      {dialog.Dialog}\n    </div>\n  )\n}'
  )

  // Fix pattern: </div></div>\n{dialog.Dialog}
  content = content.replace(
    /<\/div><\/div>\s*\n\s*\{dialog\.Dialog\}\s*\n\s*\)\s*\n\s*\}/g,
    '</div>\n      {dialog.Dialog}\n    </div>\n  )\n}'
  )

  // Fix pattern with extra divs
  content = content.replace(
    /<\/div><\/div><\/div>\s*\{dialog\.Dialog\}\s*\n\s*\)\s*\n\s*\}/g,
    '</div>\n      {dialog.Dialog}\n    </div>\n  )\n}'
  )

  fs.writeFileSync(fullPath, content)
  console.log('Fixed: ' + filePath)
})
