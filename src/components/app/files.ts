import { toast } from 'sonner'

import { createFile, openFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

export const NEW_FILE_CONTENT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'

export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- <<variables>> are highlighted and kept as written -->
<order xmlns="https://example.com/orders" id="<<orderId>>" env="<<env>>">
  <customer type="business">
    <name>Acme Corporation</name>
    <email><<customerEmail>></email>
    <address country="CA">
      <street>123 Rue Principale</street>
      <city>Montréal</city>
      <postal>H2X 1Y4</postal>
    </address>
  </customer>
  <items currency="CAD">
    <item sku="KB-001" qty="2">
      <title>Mechanical keyboard</title>
      <price>149.99</price>
    </item>
    <item sku="MS-204" qty="1">
      <title>Wireless mouse &amp; pad</title>
      <price>59.00</price>
    </item>
  </items>
  <notes><![CDATA[Leave at the <front> door]]></notes>
  <endpoint><<baseUrl>>/orders/<<orderId>></endpoint>
</order>
`

export const ACCEPTED_TYPES =
  '.xml,.xsd,.xsl,.xslt,.wsdl,.svg,.plist,.config,.csproj,.xaml,.rss,.atom,.kml,.gpx,text/xml,application/xml'

/** The tab to show after closing the one at `index`: next, else previous. */
export function neighbour<T>(list: ReadonlyArray<T>, index: number) {
  return list.at(index + 1) ?? (index > 0 ? list.at(index - 1) : undefined)
}

export function newFile() {
  const file = createFile(m.file_untitled(), NEW_FILE_CONTENT)
  setActive(file.id)
}

export function loadSample() {
  const file = createFile('sample.xml', SAMPLE_XML)
  setActive(file.id)
}

export function activate(id: string) {
  openFile(id)
  setActive(id)
}

/** Reads dropped or picked files into the cache and opens them. */
export async function importFiles(list: FileList | Array<File>) {
  let last: string | null = null
  for (const file of Array.from(list)) {
    try {
      const created = createFile(file.name, await file.text())
      last = created.id
    } catch (error) {
      toast.error(m.file_import_failed({ name: file.name }), {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }
  if (last) setActive(last)
}
