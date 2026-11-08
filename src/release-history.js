export function releasesAfter(changelog,version){
  const headings=[...changelog.matchAll(/^## v(\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})[^\r\n]*$/gm)];
  const releases=[];
  for(const [index,heading] of headings.entries()){
    const [,number,date]=heading;
    if(number===version)break;
    const body=changelog.slice(heading.index+heading[0].length,headings[index+1]?.index);
    const notes=body.trim().split(/^-[ \t]+/m).slice(1)
      .map(note=>note.trim().replace(/\r?\n[ \t]*/g,' ').replaceAll('`',''));
    if(notes.length)releases.push({number,date,notes});
  }
  return releases;
}

export function prependReleases(list,releases){
  const doc=list.ownerDocument,fragment=doc.createDocumentFragment();
  for(const {number,date,notes} of releases){
    const article=doc.createElement('article'),heading=doc.createElement('div');
    const version=doc.createElement('strong'),time=doc.createElement('time');
    article.className='release-entry';
    article.lang='ca';
    version.textContent=`v${number}`;
    time.dateTime=date;
    time.textContent=date.split('-').reverse().join('/');
    heading.append(version,time);
    article.append(heading);
    for(const note of notes){
      const paragraph=doc.createElement('p');
      paragraph.textContent=note;
      article.append(paragraph);
    }
    fragment.append(article);
  }
  list.prepend(fragment);
}
