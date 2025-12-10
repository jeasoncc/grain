# Novel Editor - Flatpak Package

Professional novel writing application with advanced project management and world-building tools.

## Features

### 📝 Advanced Text Editor
- **Rich-text editing** with Lexical editor framework
- **Markdown shortcuts** for rapid formatting  
- **Table support** for complex document structures
- **Real-time auto-save** prevents data loss
- **Multi-format export** including DOCX

### 🎯 Project Management
- **Three-tier structure**: Project → Chapter → Scene
- **Drag-and-drop reordering** for easy organization
- **Visual outline view** with quick navigation
- **Global search** across all projects and content

### 👥 Character Development
- **Character profiles** with detailed information
- **Alias management** for complex character relationships
- **Experience tracking** and backstory development
- **Character relationship mapping**

### 🌍 World-building Tools
- **Location management** for story settings
- **Faction and organization** tracking
- **Item and concept** organization
- **Integrated drawing tools** (Excalidraw canvas)
- **Mermaid diagrams** for plot visualization

### 📊 Writing Analytics
- **Real-time word counting** and progress tracking
- **Reading time estimation** based on content length
- **Chapter distribution** visualization
- **Writing statistics** and progress reports

### 🎨 Customizable Interface
- **Multiple themes** (VSCode-like experience)
- **Icon customization** with various icon sets
- **Dark/light mode** support
- **Responsive design** for all screen sizes

### 🔒 Privacy-First
- **Local storage only** - no cloud dependency
- **Offline-first** architecture
- **No data collection** or tracking
- **Complete privacy** - your stories stay on your device

## Installation

### From Flathub (Recommended)
```bash
flatpak install flathub com.lotus.NovelEditor
```

### From Release File
```bash
# Download the .flatpak file from GitHub Releases
flatpak install --user novel-editor-VERSION.flatpak
```

### Development Build
```bash
# Clone and build locally
git clone https://github.com/jeasoncc/novel-editor.git
cd novel-editor
flatpak-builder --user --install build-dir flatpak/com.lotus.NovelEditor.yml
```

## Running

### From Desktop
Launch from your application menu or activities overview.

### From Command Line
```bash
flatpak run com.lotus.NovelEditor
```

### With File Association
```bash
flatpak run com.lotus.NovelEditor /path/to/document.md
```

## System Requirements

- **OS**: Linux with Flatpak support
- **Runtime**: org.freedesktop.Platform 23.08
- **Architecture**: x86_64, aarch64
- **RAM**: 4GB recommended
- **Storage**: 500MB free space

## Permissions

Novel Editor requests the following permissions:

### Essential Permissions
- **File system access** (`--filesystem=home`) - Read/write your documents
- **Network access** (`--share=network`) - Check for updates
- **Display access** (`--socket=wayland`, `--socket=x11`) - Show the interface

### Optional Permissions  
- **Notifications** (`--talk-name=org.freedesktop.Notifications`) - Writing reminders
- **File manager** (`--talk-name=org.freedesktop.FileManager1`) - Open containing folder
- **Audio** (`--socket=pulseaudio`) - Notification sounds

### Privacy Protection
- **No webcam/microphone access**
- **No location tracking**
- **No system administration rights**
- **Sandboxed execution environment**

## Target Audience

Perfect for:
- **Novelists** writing fiction or non-fiction
- **Screenwriters** developing scripts and stories
- **Game developers** creating narrative content
- **Students** working on creative writing projects
- **Authors** managing multi-book series

## Comparison with Alternatives

| Feature | Novel Editor | Scrivener | LibreOffice Writer | Notion |
|---------|--------------|-----------|-------------------|--------|
| **Price** | Free | $60+ | Free | Freemium |
| **Privacy** | Local only | Local only | Local only | Cloud-based |
| **Novel Focus** | ✅ Specialized | ✅ Specialized | ❌ General | ❌ General |
| **Character Mgmt** | ✅ Built-in | ✅ Built-in | ❌ Manual | ⚠️ Templates |
| **World Building** | ✅ Dedicated | ⚠️ Research | ❌ None | ⚠️ Databases |
| **Modern UI** | ✅ Web-based | ❌ Native | ❌ Traditional | ✅ Web-based |
| **Cross-platform** | ✅ Linux/Win/Mac | ✅ Win/Mac | ✅ All | ✅ All |

## File Formats

### Supported Import
- Plain text (`.txt`)
- Markdown (`.md`)
- JSON project files

### Supported Export
- Microsoft Word (`.docx`)
- Plain text (`.txt`)
- Markdown (`.md`)
- JSON project backup

## Troubleshooting

### Application Won't Start
```bash
# Check Flatpak installation
flatpak list | grep NovelEditor

# Reinstall if needed
flatpak uninstall com.lotus.NovelEditor
flatpak install flathub com.lotus.NovelEditor
```

### File Access Issues
```bash
# Grant additional file system access
flatpak override --user --filesystem=/path/to/documents com.lotus.NovelEditor
```

### Performance Issues
```bash
# Check system resources
flatpak run --command=sh com.lotus.NovelEditor
# Inside container: top, free -h
```

### Reset Application Data
```bash
# Clear application data (WARNING: This deletes all projects!)
flatpak run --command=sh com.lotus.NovelEditor
rm -rf ~/.var/app/com.lotus.NovelEditor/
```

## Development

### Building from Source
```bash
# Install Flatpak development tools
sudo apt install flatpak-builder

# Install required runtimes
flatpak install flathub org.freedesktop.Platform//23.08
flatpak install flathub org.freedesktop.Sdk//23.08
flatpak install flathub org.freedesktop.Sdk.Extension.node18//23.08
flatpak install flathub org.freedesktop.Sdk.Extension.rust-stable//23.08

# Build
flatpak-builder --user --install build-dir flatpak/com.lotus.NovelEditor.yml
```

### Testing Changes
```bash
# Run development build
flatpak run com.lotus.NovelEditor

# Debug mode
flatpak run --devel com.lotus.NovelEditor
```

## Support

- **Homepage**: https://github.com/jeasoncc/novel-editor
- **Issues**: https://github.com/jeasoncc/novel-editor/issues
- **Discussions**: https://github.com/jeasoncc/novel-editor/discussions
- **Flathub**: https://flathub.org/apps/com.lotus.NovelEditor

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/jeasoncc/novel-editor/blob/main/CONTRIBUTING.md) for details.

### Flatpak-specific Contributions
- Test on different Linux distributions
- Report sandboxing issues
- Suggest permission optimizations
- Help with translations

## License

Novel Editor is released under the MIT License. See [LICENSE](https://github.com/jeasoncc/novel-editor/blob/main/LICENSE) for details.

## Acknowledgments

- **Flatpak Community** for the excellent packaging system
- **Flathub** for providing free app distribution
- **Tauri** for the cross-platform framework
- **Lexical** for the rich text editor
- **All contributors** who make this project possible