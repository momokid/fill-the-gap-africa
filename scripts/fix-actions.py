import io

edits = {
    'views/admin/page-form.ejs': (
        '<%= isNew ? \'/admin/pages\' : \'/admin/pages/\' + page.id %>',
        '<%= isNew ? adminBase + \'/pages\' : adminBase + \'/pages/\' + page.id %>'
    ),
    'views/admin/post-form.ejs': (
        '<%= isNew ? \'/admin/posts\' : \'/admin/posts/\' + post.id %>',
        '<%= isNew ? adminBase + \'/posts\' : adminBase + \'/posts/\' + post.id %>'
    ),
    'views/admin/program-form.ejs': (
        '<%= isNew ? \'/admin/programs\' : \'/admin/programs/\' + program.id %>',
        '<%= isNew ? adminBase + \'/programs\' : adminBase + \'/programs/\' + program.id %>'
    ),
    'views/admin/team-form.ejs': (
        '<%= isNew ? \'/admin/team\' : \'/admin/team/\' + member.id %>',
        '<%= isNew ? adminBase + \'/team\' : adminBase + \'/team/\' + member.id %>'
    ),
    'views/admin/user-form.ejs': (
        '<%= mode === \'new\' ? \'/admin/users\' : \'/admin/users/\' + user.id %>',
        '<%= mode === \'new\' ? adminBase + \'/users\' : adminBase + \'/users/\' + user.id %>'
    )
}

for path, (old, new) in edits.items():
    s = io.open(path, encoding='utf-8').read()
    if old in s:
        s = s.replace(old, new)
        io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
        print('fixed', path)
    else:
        print('MISS', path)
