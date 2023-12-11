#!/bin/bash

if [[ $(id -u) -ne 0 ]] ; then echo "Please run as root" ; exit 1 ; fi

echo "Checking JAVA installation..."
copySucceeded=1

if type -p java; then
    _java=java
elif [[ -n "$JAVA_HOME" ]] && [[ -x "$JAVA_HOME/bin/java" ]];  then
    _java="$JAVA_HOME/bin/java"
else
    echo "Looks like JAVA is not installed. You can download it from https://www.java.com/"
fi

if [[ "$_java" ]]; then
    echo "Checking JAVA version..."

    version=$("$_java" -version 2>&1 | head -1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)

    if [ $version -gt 7 ]; then
        echo Your Java version is "$version" - OK

        echo "Installing Crowdin CLI..."

        cp crowdin-cli.jar /usr/local/bin

        copySucceeded=$?

        [ -d "/etc/bash_completion.d" ] && cp crowdin_completion /etc/bash_completion.d/crowdin_completion
        [ -d "/usr/local/etc/bash_completion.d" ] && cp crowdin_completion /usr/local/etc/bash_completion.d/crowdin_completion

        sh -c "cat > /usr/local/bin/crowdin << EOF
#!/bin/bash
exec /usr/bin/java -jar '/usr/local/bin/crowdin-cli.jar' \"\\\$@\"
EOF"
        chmod +x /usr/local/bin/crowdin

        sh -c "cat > /usr/local/bin/crowdin_uninstall << 'EOF'
#!/bin/bash
if [[ \$(id -u) -ne 0 ]] ; then echo \"Please run as root\" ; exit 1 ; fi
rm -f /etc/bash_completion.d/crowdin_completion
rm -f /usr/local/etc/bash_completion.d/crowdin_completion
rm -f /usr/local/bin/crowdin-cli.jar
rm -f /usr/local/bin/crowdin
rm -f /usr/local/bin/crowdin_uninstall
echo \"crowdin-cli uninstalled!\"
EOF"
        chmod +x /usr/local/bin/crowdin_uninstall

    else
        echo Your Java version is "$version" - needs to be updated. You can download it from https://www.java.com/
    fi
fi

if [ $copySucceeded -ne 0 ]; then
    echo "Crowdin CLI not installed!"
else
    echo "Crowdin CLI installed!"
fi
