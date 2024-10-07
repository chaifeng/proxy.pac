#!/usr/bin/env bash
set -euo pipefail

IFS='.' read -r __major __minor _ <<< "${BASH_VERSION:-0.0.0}"
if [ "$__major" -lt 4 ] || { [ "$__major" -eq 4 ] && [ "$__minor" -lt 3 ]; }; then
    echo "Error: this script requires Bash version 4.3 or higher. Your current version is ${BASH_VERSION:-unknown}." >&2
    echo "" >&2
    echo "$BASH --version" >&2
    "$BASH" --version >&2
    exit 1
fi

cd "$(dirname "$0")"

declare -A files
files[gfwlist.txt]=https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt
files[china.txt]=https://gaoyifan.github.io/china-operator-ip/china.txt
files[china6.txt]=https://gaoyifan.github.io/china-operator-ip/china6.txt

function cleanup() {
    local retval="$?"
    if [[ -n "${del_file_on_exit-}" && -f "${del_file_on_exit}" ]]; then
        echo "Remove ${del_file_on_exit}"
        rm "${del_file_on_exit}"
        exit "$retval"
    fi
} >&2
trap cleanup EXIT ERR SIGINT

for f in "${!files[@]}"; do
    del_file_on_exit="$f"
    url="${files[$f]}"
    if [[ ! -f "$f" ]]; then
        if command -v wget &>/dev/null; then
            wget -O "$f" "$url"
        elif command -v curl &>/dev/null; then
            curl --output "$f" "$url"
        else
            echo "Error: please install wget or curl."
            exit 1
        fi
    fi
done

del_file_on_exit=auto-proxy.txt
[ auto-proxy.txt -nt gfwlist.txt ] || base64 -d <gfwlist.txt >auto-proxy.txt

del_file_on_exit=

domain_segments() {
    local domain="$1"
    while [[ -n "${domain}" ]]; do
        echo "$domain"
        [[ "${domain-}" = *.* ]] || break
        domain="${domain#*.}"
    done
}

actual="$(domain_segments foo.bar.example.com)"
expected="foo.bar.example.com bar.example.com example.com com"
if [[ "$actual" = "$expected" ]]; then
    echo "Fail: test for function domain_segments"
    echo "  expected: $expected"
    echo "    actual: $actual"
    exit 1
fi >&2

ipv6_to_array_format() {
  while IFS= read -r line; do
    local ipv6="${line%%/*}"
    local prefix="${line##*/}"

    local expanded_ipv6=$(expand_ipv6 "$ipv6")
    local full_hex="${expanded_ipv6//:/}"

    echo "  [0x${full_hex:0:16}n, 0x${full_hex:16:16}n, ${prefix}], // ${line}"
  done
}

expand_ipv6() {
  local ipv6="$1"
  local full_ipv6=""
  if [[ "$ipv6" == *"::"* ]]; then
    local left_part="${ipv6%%::*}"
    local right_part="${ipv6##*::}"

    local left_segments=(${left_part//:/ })
    local right_segments=(${right_part//:/ })

    local num_missing=$(( 8 - ${#left_segments[@]} - ${#right_segments[@]} ))

    for segment in "${left_segments[@]}"; do
      full_ipv6+="$(printf "%04x" "0x$segment"):"
    done
    for ((i=0; i<num_missing; i++)); do
      full_ipv6+="0000:"
    done
    for segment in "${right_segments[@]}"; do
      full_ipv6+="$(printf "%04x" "0x$segment"):"
    done

    echo "${full_ipv6%:}"
  else
    echo "$ipv6"
  fi
}

generate_pac() {
    local jsfile="$1"

    declare -A domain_rules
    local file rule domain
    for file in *.txt.example; do
        [ -f "${file%.example}" ] || cp -v "${file}" "${file%.example}"
    done >&2
    for file in domain-rules-*.txt; do
        rule="${file#domain-rules-}"
        rule="${rule%.txt}"
        while IFS= read -r domain; do
            domain="${domain%%#*}"
            domain="${domain// }"
            [[ -n "$domain" ]] || continue
            domain_rules["$domain"]="$rule";
        done  < "$file"
    done

    local line item rule parent_rule
    while read -r line; do
        echo "$line" >&2
        rule=
        case "$line" in
            (/*)
                echo "Skip regrex rul: $line"
                ;;
            (\!*|\[*)
                : comment
                ;;
            (@@\|\|*)
                line="${line#@}"
                ;&
            (@@\|*)
                line="${line#@?|}"
                line="${line#*://}"
                line="${line%%\%2F*}"
                domain="${line%%/*}"
                rule=direct
                echo "==> direct access: $domain"
                ;;
            (\|\|*)
                line="${line#|}"
                ;&
            (\|*)
                line="${line#|}"
                line="${line#*://}"
                ;&
            ([.a-z0-9]*)
                line="${line#.}"
                line="${line%%\%2F*}"
                domain="${line%%/*}"
                domain="${domain#*\**.}"
                rule=proxy
                echo "==> proxy access: $domain"
                ;;
            (*)
                [[ "$line" =~ ^[[:space:]]*$ ]] ||
                    echo "Skip: $line"
                ;;
        esac >&2
        [[ -n "${rule}" ]] || continue
        [[ -z "${domain_rules[$domain]-}" ]] || continue
        parent_rule=
        for item in $(domain_segments "$domain"); do
            if [[ -n "${domain_rules[$item]-}" ]]; then
                parent_rule="${domain_rules[$item]}"
                break
            fi
        done
        if [[ -z "$parent_rule" ]] || [[ "$parent_rule" != "$rule" ]]; then
            domain_rules["$domain"]="$rule"
        fi
    done < <(sed '/URL Keywords/,/^!/d' auto-proxy.txt)

    local domain rule parent_rule
    declare -a segments
    for domain in "${!domain_rules[@]}"; do
        rule="${domain_rules[$domain]}"
        segments=($(domain_segments "$domain" 2>/dev/null))
        parent_rule=
        for item in ${segments[@]:1}; do
            parent_rule="${domain_rules[$item]-}"
            [[ -z "${parent_rule-}" ]] || break
        done
        if [[ "${parent_rule-}" = "${rule}" ]]; then
            unset "domain_rules[$domain]"
        fi
    done

    sed -n '1,/ begin of ipv4 networks$/p' "$jsfile"
    cat china.txt |
        while read -r line; do
            while IFS=/ read ip prefix; do
                while IFS=. read n1 n2 n3 n4; do
                    printf "  [0x%02x%02x%02x%02x, %s], // %s\n" "${n1:-0}" "${n2:-0}" "${n3:-0}" "${n4:-0}" "$prefix" "$line"
                done <<< "$ip"
            done <<< "${line}";
        done
    sed -n '/ end of ipv4 networks$/,/ begin of ipv6 networks$/p' "$jsfile"
    ipv6_to_array_format <china6.txt
    sed -n '/ end of ipv6 networks$/,/ begin of proxy rules$/p' "$jsfile"
    local domain
    for domain in "${!domain_rules[@]}"; do
        rule="${domain_rules[$domain]}"
        [[ "$rule" = @(blocked|direct|proxy) ]] || rule="\"$rule\""
        printf "  \"%s\": %s,\n" "$domain" "$rule"
    done | sort
    sed -n '/ end of proxy rules$/,$p' "$jsfile"
}

del_file_on_exit=proxy.pac
generate_pac "./proxy.js" > proxy.pac

if command -v node &>/dev/null; then
    node proxy.pac test
fi
del_file_on_exit=
