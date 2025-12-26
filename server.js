// 保存为 server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DATA_FILE = 'data.txt';

// 读取数据文件
function readData() {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        return lines.map(line => {
            const [id, text, completed, createdAt] = line.split('|');
            return {
                id: parseInt(id),
                text,
                completed: completed === 'true',
                createdAt
            };
        });
    } catch (err) {
        return [];
    }
}

// 写入数据文件
function writeData(todos) {
    const lines = todos.map(todo => 
        `${todo.id}|${todo.text}|${todo.completed}|${todo.createdAt}`
    ).join('\n');
    
    fs.writeFileSync(DATA_FILE, lines);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API路由
    if (pathname === '/api/todos') {
        if (req.method === 'GET') {
            const todos = readData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(todos));
        }
        
        else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            
            req.on('end', () => {
                try {
                    const todo = JSON.parse(body);
                    const todos = readData();
                    
                    const newTodo = {
                        id: todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1,
                        text: todo.text,
                        completed: false,
                        createdAt: new Date().toISOString()
                    };
                    
                    todos.push(newTodo);
                    writeData(todos);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newTodo));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid data' }));
                }
            });
        }
    }
    
    else if (pathname.startsWith('/api/todos/')) {
        const id = parseInt(pathname.split('/')[3]);
        
        if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            
            req.on('end', () => {
                const updatedData = JSON.parse(body);
                const todos = readData();
                const index = todos.findIndex(t => t.id === id);
                
                if (index !== -1) {
                    todos[index] = { ...todos[index], ...updatedData };
                    writeData(todos);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(todos[index]));
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Todo not found' }));
                }
            });
        }
        
        else if (req.method === 'DELETE') {
            const todos = readData();
            const filtered = todos.filter(t => t.id !== id);
            
            if (filtered.length !== todos.length) {
                writeData(filtered);
                res.writeHead(204);
                res.end();
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Todo not found' }));
            }
        }
    }
    
    // 静态文件服务
    else {
        let filePath = pathname === '/' ? '/app.html' : pathname;
        filePath = path.join(__dirname, filePath);
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>');
                } else {
                    res.writeHead(500);
                    res.end('Server Error');
                }
            } else {
                let contentType = 'text/html';
                
                if (filePath.endsWith('.js')) contentType = 'text/javascript';
                if (filePath.endsWith('.css')) contentType = 'text/css';
                if (filePath.endsWith('.json')) contentType = 'application/json';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
});