const kindMarker = /<!--\s*atlas-kind:[\s\S]*?-->/g;
export function editableContent(content='') { return content.replace(kindMarker, '').replace(/^\r?\n/, ''); }
export function preserveSectionKind(original='', edited='') {
 const marker=original.match(kindMarker)?.[0];
 const clean=editableContent(edited);
 return marker ? marker+'\n'+clean : clean;
}
