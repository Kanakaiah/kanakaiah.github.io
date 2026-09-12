const fs = require('fs');
let data = fs.readFileSync('src/screens/Guides.tsx', 'utf8');

data = data.replace(
  "const [searchQuery, setSearchQuery] = useState('');",
  "const [activeTab, setActiveTab] = useState<'books' | 'guides'>('books');\n  const [searchQuery, setSearchQuery] = useState('');"
);

data = data.replace(
  '<div className="hidden lg:block mb-2">\n        <h1 className="text-3xl font-heading font-bold text-primary">Bible</h1>\n      </div>',
  '<div className="hidden lg:block mb-2">\n        <h1 className="text-3xl font-heading font-bold text-primary">Bible</h1>\n      </div>\n\n      <div className="flex bg-card p-1 rounded-lg shadow-sm border border-card-border mt-[-10px] sm:max-w-[300px]">\n        <button\n          onClick={() => setActiveTab(\'books\')}\n          className={`flex-1 py-1.5 text-sm font-bold tracking-wide uppercase rounded-md transition-all duration-200 ${activeTab === \'books\' ? \'bg-accent/10 text-accent shadow-sm\' : \'text-muted hover:text-primary hover:bg-card-elevated\'}`}\n        >\n          Books\n        </button>\n        <button\n          onClick={() => setActiveTab(\'guides\')}\n          className={`flex-1 py-1.5 text-sm font-bold tracking-wide uppercase rounded-md transition-all duration-200 ${activeTab === \'guides\' ? \'bg-accent/10 text-accent shadow-sm\' : \'text-muted hover:text-primary hover:bg-card-elevated\'}`}\n        >\n          Guides\n        </button>\n      </div>'
);

data = data.replace(
  '<div className="flex flex-col gap-8 pb-12">\n        {/* 📖 Bible Books - OT 📖 */}',
  '<div className="flex flex-col gap-8 pb-12">\n        {activeTab === \'books\' && (\n          <>\n        {/* 📖 Bible Books - OT 📖 */}'
);

data = data.replace(
  '{/* 📚 Study resources 📚 */}',
  '  </>\n        )}\n\n        {activeTab === \'guides\' && (\n          <>\n        {/* 📚 Study resources 📚 */}'
);

const lastIndex = data.lastIndexOf('</div>\n    </div>\n  );\n}');
if (lastIndex !== -1) {
  data = data.substring(0, lastIndex) + '        </>\n        )}\n      ' + data.substring(lastIndex);
}

fs.writeFileSync('src/screens/Guides.tsx', data);
console.log('done');
