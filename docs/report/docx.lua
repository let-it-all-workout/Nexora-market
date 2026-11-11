-- Pandoc filter that turns PROJECT_REPORT.md into a print-ready .docx.

local PAGE_BREAK = pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

local function xml_escape(text)
  return (text:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'))
end

-- A4 content width with a 1.5 in left margin and a 1 in right margin.
-- Right-aligned page numbers with no dotted leaders.
local function toc_line(label, page, bold, indent)
  local weight = bold and '<w:b/><w:bCs/>' or ''
  return pandoc.RawBlock('openxml', string.format([[
<w:p>
  <w:pPr>
    <w:tabs><w:tab w:val="right" w:pos="8306"/></w:tabs>
    <w:spacing w:before="60" w:after="60" w:line="276" w:lineRule="auto"/>
    <w:ind w:left="%d" w:right="0"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>%s<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>%s</w:rPr><w:tab/></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>%s<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>%s</w:t></w:r>
</w:p>]], indent or 0, weight, xml_escape(label), weight, weight, xml_escape(page or '')))
end

local function list_lines(tbl)
  local lines = {}
  local body = tbl.bodies and tbl.bodies[1]
  local rows = body and body.body or {}
  for _, row in ipairs(rows) do
    local cells = row.cells or {}
    if cells[1] then
      local label = pandoc.utils.stringify(cells[1].contents):gsub('%s+', ' ')
      local page = cells[2] and pandoc.utils.stringify(cells[2].contents):gsub('%s+', ' ') or ''
      local bold = label:match('^CHAPTER') or label:match('^Appendix') or label == 'References'
      local indent = 0
      if label:match('^%d+%.%d+%.%d+') then
        indent = 720
      elseif label:match('^%d+%.%d+') then
        indent = 360
      end
      table.insert(lines, toc_line(label, page, bold, indent))
    end
  end
  return lines
end

local function is_page_break(block)
  return block.t == 'RawBlock' and block.format == 'html' and block.text:match('page break')
end

local function only_image(block)
  return block.t == 'Para' and #block.content == 1 and block.content[1].t == 'Image'
end

local function is_caption(block)
  if block.t ~= 'Para' or not block.content[1] or block.content[1].t ~= 'Strong' then return false end
  local text = pandoc.utils.stringify(block.content[1])
  return text:match('^Fig') ~= nil or text:match('^Table') ~= nil
end

local function centered(block)
  return pandoc.Div({ block }, { ['custom-style'] = 'CenterPara' })
end

function Pandoc(doc)
  local out = {}
  local blocks = doc.blocks
  local i = 1

  if blocks[1] and blocks[1].t == 'Header' and pandoc.utils.stringify(blocks[1]):match('^PROJECT REPORT') then
    i = 2
  end

  local cover = {}
  while i <= #blocks and not is_page_break(blocks[i]) do
    local b = blocks[i]
    if b.t == 'Header' then
      table.insert(cover, pandoc.Para(b.content))
    elseif b.t ~= 'BlockQuote' and b.t ~= 'HorizontalRule' then
      table.insert(cover, b)
    end
    i = i + 1
  end
  table.insert(out, pandoc.Div(cover, { ['custom-style'] = 'Cover' }))

  local list_heading = nil
  local in_chapters = false
  while i <= #blocks do
    local b = blocks[i]
    if b.t == 'Header' and pandoc.utils.stringify(b) == 'CHAPTER ONE' then
      in_chapters = true
    end
    if not in_chapters and b.t == 'Header' and b.level == 2 then
      b.level = 1
    end
    local heading = b.t == 'Header' and pandoc.utils.stringify(b) or nil
    if heading == 'TABLE OF CONTENTS' or heading == 'LIST OF TABLES' or heading == 'LIST OF FIGURES' then
      list_heading = heading
    end
    if is_page_break(b) then
      list_heading = nil
      table.insert(out, PAGE_BREAK)
    elseif b.t == 'BlockQuote' or b.t == 'HorizontalRule' then
      -- working notes and separators are not printed
    elseif list_heading and b.t == 'Table' then
      for _, line in ipairs(list_lines(b)) do
        table.insert(out, line)
      end
      list_heading = nil
    elseif only_image(b) then
      local img = b.content[1]
      img.attributes.width = img.src:match('mobile') and '2.8in' or '6in'
      table.insert(out, centered(b))
    elseif is_caption(b) then
      table.insert(out, centered(b))
    else
      table.insert(out, b)
    end
    i = i + 1
  end

  doc.blocks = out
  return doc
end
