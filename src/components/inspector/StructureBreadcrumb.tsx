import { Fragment } from 'react'

import { revealElement } from '#/components/editor/editor-store'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import { ancestorPaths, displayPath, elementByPath } from '#/lib/xml/locate'
import { m } from '#/paraglide/messages'
import type { XmlNode } from '#/lib/xml/model'

export function StructureBreadcrumb({
  nodes,
  path,
  onNavigate,
}: {
  nodes: Array<XmlNode>
  path: string | null
  onNavigate: () => void
}) {
  if (!path) return null
  const paths = [...ancestorPaths(path), path]
  const labels = displayPath(path)

  return (
    <Breadcrumb
      aria-label={m.tree_path()}
      className="min-w-0 overflow-x-auto border-t px-3"
    >
      <BreadcrumbList className="min-h-11 w-max flex-nowrap gap-1 font-mono md:min-h-8">
        {paths.map((current, index) => (
          <Fragment key={current}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="shrink-0">
              {current === path ? (
                <BreadcrumbPage>{labels[index]}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <button
                    type="button"
                    className="min-h-11 px-1 focus-visible:outline-2 focus-visible:outline-ring md:min-h-8"
                    onClick={() => {
                      const element = elementByPath(nodes, current)
                      if (!element) return
                      onNavigate()
                      revealElement(element)
                    }}
                  >
                    {labels[index]}
                  </button>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
