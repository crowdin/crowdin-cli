echo "Checking JAVA installation..."
copySuccessed=1

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

    if  (( $version > 7 )); then
        echo Your Java version is "$version" - OK

        echo "Installing Crowdin CLI..."

        sudo cp crowdin-cli.jar /usr/local/bin

        copySuccessed=$?

        [ -d "/etc/bash_completion.d" ] && sudo cp crowdin_completion /etc/bash_completion.d/crowdin_completion
        [ -d "/usr/local/etc/bash_completion.d" ] && sudo cp crowdin_completion /usr/local/etc/bash_completion.d/crowdin_completion

        sudo sh -c "cat > /usr/local/bin/crowdin << EOF
#!/bin/sh
exec /usr/bin/java -jar '/usr/local/bin/crowdin-cli.jar' \"\\\$@\"
EOF"
        sudo chmod +x /usr/local/bin/crowdin

    else
        echo Your Java version is "$version" - needs to be updated. You can download it from https://www.java.com/
    fi
fi

if [ $copySuccessed -ne 0 ]; then
    echo "Crowdin CLI not installed!"
else
    echo "Crowdin CLI installed!"
fi
